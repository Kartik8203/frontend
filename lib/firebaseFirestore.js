import { firebase } from './firebaseConfig';
import 'firebase/compat/firestore';
import { getCurrentUser } from './auth-service';

const db = firebase.firestore();
const patientsCollection = db.collection('patients');
const assessmentsCollection = db.collection('assessments');

/**
 * Save a new patient or update existing patient to Firestore
 * @param {Object} patientInfo - Patient identification information
 * @returns {Promise<string>} - Returns patient doc ID
 */
export async function savePatient(patientInfo) {
  const { name, id } = patientInfo;
  
  try {
    // Add error handling for missing parameters
    if (!id) {
      throw new Error("Patient ID is required");
    }
    
    // Get current user
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to save patient data");
    }
    
    const userId = user.uid;
    
    // Check if patient already exists for this user
    const patientQuery = await patientsCollection
      .where('patientId', '==', id)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (!patientQuery.empty) {
      // Patient exists, update the record
      const patientDoc = patientQuery.docs[0];
      await patientDoc.ref.update({
        name: name || patientDoc.data().name, // Keep existing name if not provided
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return patientDoc.id;
    } else {
      // Create new patient
      const patientRef = await patientsCollection.add({
        patientId: id,
        userId: userId, // Associate with current user
        name: name || 'Unknown', // Provide default if name is not provided
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return patientRef.id;
    }
  } catch (error) {
    console.error("Error saving patient:", error);
    // Throw a more detailed error for debugging
    throw new Error(`Failed to save patient (ID: ${id}): ${error.message}`);
  }
}

/**
 * Save assessment data to Firestore
 * @param {Object} assessmentData - Complete assessment data object
 * @returns {Promise<string>} - Returns assessment doc ID
 */
export async function saveAssessmentToFirestore(assessmentData) {
  const { id, name, timestamp, riskScore, riskLevel, vitals } = assessmentData;
  
  try {
    // Add validation
    if (!id) {
      throw new Error("Patient ID is required");
    }
    
    // Get current user
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to save assessment data");
    }
    
    const userId = user.uid;
    
    // First save/update patient
    const patientDocId = await savePatient({ id, name });
    
    // Ensure timestamp is valid
    const assessmentTimestamp = timestamp ? 
      firebase.firestore.Timestamp.fromDate(new Date(timestamp)) : 
      firebase.firestore.FieldValue.serverTimestamp();
    
    // Save assessment
    const assessmentRef = await assessmentsCollection.add({
      patientId: id,
      patientDocId,
      userId: userId, // Associate with current user
      timestamp: assessmentTimestamp,
      riskScore: riskScore || 0,
      riskLevel: riskLevel || 'unknown',
      vitals: vitals || {},
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return assessmentRef.id;
  } catch (error) {
    console.error("Error saving assessment:", error);
    throw new Error(`Failed to save assessment for patient (ID: ${id}): ${error.message}`);
  }
}

/**
 * Get all patients from Firestore for the current user
 * @param {number} limit - Maximum number of patients to return
 * @returns {Promise<Array>} - Array of patient objects
 */
export async function getPatients(limit = 100) {
  try {
    // Get current user
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to retrieve patient data");
    }
    
    const userId = user.uid;
    
    const snapshot = await patientsCollection
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching patients:", error);
    throw error;
  }
}

/**
 * Get assessments for a specific patient
 * @param {string} patientId - The patient ID to fetch assessments for
 * @returns {Promise<Array>} - Array of assessment objects
 */
export async function getPatientAssessments(patientId) {
  try {
    if (!patientId) {
      throw new Error("Patient ID is required to fetch assessments");
    }
    
    // Get current user
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to retrieve assessment data");
    }
    
    const userId = user.uid;
    
    const snapshot = await assessmentsCollection
      .where('patientId', '==', patientId)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw error;
  }
}

/**
 * Get the latest assessments for the current user
 * @param {number} limit - Maximum number of assessments to return
 * @returns {Promise<Array>} - Array of assessment objects
 */
export async function getLatestAssessments(limit = 10) {
  try {
    // Get current user
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to retrieve assessment data");
    }
    
    const userId = user.uid;
    
    const snapshot = await assessmentsCollection
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    // Get all assessments
    const assessments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get all unique patient IDs from these assessments
    const patientIds = [...new Set(assessments.map(a => a.patientDocId).filter(id => id))];
    
    // Check if patientIds is empty
    if (patientIds.length === 0) {
      return assessments.map(assessment => ({
        ...assessment,
        name: 'Unknown'
      }));
    }
    
    // Batch get all patients
    const patientSnapshots = await Promise.all(
      patientIds.map(patientId => {
        return patientsCollection.doc(patientId).get();
      })
    );
    
    // Create a lookup map of patient data
    const patientMap = {};
    patientSnapshots.forEach(doc => {
      if (doc.exists) {
        patientMap[doc.id] = doc.data();
      }
    });
    
    // Combine assessment data with patient data
    return assessments.map(assessment => ({
      ...assessment,
      name: (assessment.patientDocId && patientMap[assessment.patientDocId]?.name) || 'Unknown'
    }));
  } catch (error) {
    console.error("Error fetching latest assessments:", error);
    throw error;
  }
}

/**
 * Get statistics from Firestore for the current user
 * @returns {Promise<Object>} - Statistics object
 */
export async function getFirestoreStatistics() {
  try {
    // Get current user
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to retrieve statistics");
    }
    
    const userId = user.uid;
    
    // Get total number of patients for this user
    const patientsSnapshot = await patientsCollection
      .where('userId', '==', userId)
      .get();
    const total = patientsSnapshot.size;
    
    // Get all assessments for this user
    const assessmentsSnapshot = await assessmentsCollection
      .where('userId', '==', userId)
      .get();
    const assessments = assessmentsSnapshot.docs.map(doc => doc.data());
    
    // Count risk levels
    const lowRisk = assessments.filter(a => a.riskScore < 25).length;
    const mediumRisk = assessments.filter(a => a.riskScore >= 25 && a.riskScore < 75).length;
    const highRisk = assessments.filter(a => a.riskScore >= 75).length;
    
    // Get assessments from last month for trend calculation
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const lastMonthQuery = await assessmentsCollection
      .where('userId', '==', userId)
      .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(lastMonth))
      .get();
    
    const lastMonthAssessments = lastMonthQuery.docs.map(doc => doc.data());
    const lastMonthLow = lastMonthAssessments.filter(a => a.riskScore < 25).length;
    const lastMonthMedium = lastMonthAssessments.filter(a => a.riskScore >= 25 && a.riskScore < 75).length;
    const lastMonthHigh = lastMonthAssessments.filter(a => a.riskScore >= 75).length;
    
    // Calculate trends based on actual data
    let totalTrend = 0;
    let lowTrend = 0;
    let mediumTrend = 0;
    let highTrend = 0;
    
    // Only calculate if we have data from last month
    if (lastMonthAssessments.length > 0) {
      // Simple percentage change calculation
      totalTrend = ((assessments.length - lastMonthAssessments.length) / lastMonthAssessments.length) * 100 || 0;
      lowTrend = lastMonthLow > 0 ? ((lowRisk - lastMonthLow) / lastMonthLow) * 100 : 0;
      mediumTrend = lastMonthMedium > 0 ? ((mediumRisk - lastMonthMedium) / lastMonthMedium) * 100 : 0;
      highTrend = lastMonthHigh > 0 ? ((highRisk - lastMonthHigh) / lastMonthHigh) * 100 : 0;
    }
    
    return {
      total,
      lowRisk,
      mediumRisk,
      highRisk,
      trend: {
        total: Math.round(totalTrend),
        lowRisk: Math.round(lowTrend),
        mediumRisk: Math.round(mediumTrend),
        highRisk: Math.round(highTrend)
      }
    };
  } catch (error) {
    console.error("Error getting statistics:", error);
    // Return default stats on error
    return {
      total: 0,
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      trend: { total: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0 }
    };
  }
}

export async function deleteAssessment(assessmentId) {
  try {
    // Get current user
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to delete assessment data");
    }
    
    // Verify the assessment exists
    const assessmentDoc = await assessmentsCollection.doc(assessmentId).get();
    
    if (!assessmentDoc.exists) {
      throw new Error("Assessment not found");
    }
    
    // Security check: Verify the assessment belongs to the current user
    const assessmentData = assessmentDoc.data();
    if (assessmentData.userId !== user.uid) {
      throw new Error("You don't have permission to delete this assessment");
    }
    
    const patientId = assessmentData.patientId;
    const patientDocId = assessmentData.patientDocId;
    
    // Delete the assessment
    await assessmentsCollection.doc(assessmentId).delete();
    console.log(`Assessment ${assessmentId} successfully deleted`);
    
    // Check if this was the last assessment for this patient
    if (patientId && patientDocId) {
      const remainingAssessments = await assessmentsCollection
        .where('patientId', '==', patientId)
        .where('userId', '==', user.uid)
        .limit(1)
        .get();
      
      // If no assessments remain for this patient, delete the patient record
      if (remainingAssessments.empty) {
        await patientsCollection.doc(patientDocId).delete();
        console.log(`Patient ${patientDocId} (ID: ${patientId}) successfully deleted`);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting assessment:", error);
    throw error;
  }
}