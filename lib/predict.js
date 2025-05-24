// predict.js - Risk Prediction Functions
import { getCurrentUser } from './auth-service';

/**
 * Calculates the health risk score based on patient vital signs and demographics
 * @param {Object} patientData - Object containing patient vital data
 * @returns {Object} - Risk score and analysis
 */
export function calculateRiskScore(patientData) {
  // Initialize risk score and risk factors
  let riskScore = 0;
  let riskFactors = [];
  
  // Extract values for clarity
  const {
    heart_rate,
    resp_rate,
    body_temp,
    oxygen_sat,
    systolic_bp,
    diastolic_bp,
    age,
    gender,
    weight,
    height,
    hrv,
    bmi
  } = patientData;
  
  // --- Age factor ---
  if (age > 65) {
    riskScore += 20;
    riskFactors.push({ name: "Advanced Age", value: true });
  } else if (age > 50) {
    riskScore += 10;
    riskFactors.push({ name: "Increased Age", value: true });
  } else {
    riskFactors.push({ name: "Advanced Age", value: false });
  }
  
  // --- Blood pressure factor ---
  if (systolic_bp > 140 || diastolic_bp > 90) {
    riskScore += 15;
    riskFactors.push({ name: "High Blood Pressure", value: true });
  } else {
    riskFactors.push({ name: "High Blood Pressure", value: false });
  }
  
  if (systolic_bp < 90 || diastolic_bp < 60) {
    riskScore += 15;
    riskFactors.push({ name: "Low Blood Pressure", value: true });
  } else {
    riskFactors.push({ name: "Low Blood Pressure", value: false });
  }
  
  // --- Heart rate factor ---
  if (heart_rate > 100) {
    riskScore += 15;
    riskFactors.push({ name: "Elevated Heart Rate", value: true });
  } else if (heart_rate < 60) {
    riskScore += 10;
    riskFactors.push({ name: "Low Heart Rate", value: true });
  } else {
    riskFactors.push({ name: "Abnormal Heart Rate", value: false });
  }
  
  // --- Respiratory rate factor ---
  if (resp_rate > 20) {
    riskScore += 10;
    riskFactors.push({ name: "High Respiratory Rate", value: true });
  } else if (resp_rate < 12) {
    riskScore += 15;
    riskFactors.push({ name: "Low Respiratory Rate", value: true });
  } else {
    riskFactors.push({ name: "Abnormal Respiratory Rate", value: false });
  }
  
  // --- Oxygen saturation ---
  if (oxygen_sat < 95) {
    riskScore += 20;
    riskFactors.push({ name: "Low Oxygen Saturation", value: true });
  } else if (oxygen_sat < 98) {
    riskScore += 5;
    riskFactors.push({ name: "Borderline Oxygen Saturation", value: true });
  } else {
    riskFactors.push({ name: "Low Oxygen Saturation", value: false });
  }
  
  // --- Body temperature ---
  if (body_temp > 38.0) {
    riskScore += 15;
    riskFactors.push({ name: "Fever", value: true });
  } else if (body_temp < 36.0) {
    riskScore += 15;
    riskFactors.push({ name: "Hypothermia", value: true });
  } else {
    riskFactors.push({ name: "Abnormal Temperature", value: false });
  }
  
  // --- BMI factor ---
  if (bmi > 30) {
    riskScore += 10;
    riskFactors.push({ name: "Obesity", value: true });
  } else if (bmi < 18.5) {
    riskScore += 10;
    riskFactors.push({ name: "Underweight", value: true });
  } else {
    riskFactors.push({ name: "Abnormal BMI", value: false });
  }
  
  // --- HRV factor ---
  if (hrv < 0.05) {
    riskScore += 10;
    riskFactors.push({ name: "Low Heart Rate Variability", value: true });
  } else {
    riskFactors.push({ name: "Low Heart Rate Variability", value: false });
  }
  
  // Cap the risk score at 100%
  riskScore = Math.min(riskScore, 100);
  
  // Generate vital signs data with normal ranges
  const vitals = [
    { 
      name: "Heart Rate", 
      value: `${heart_rate} BPM`, 
      normal: heart_rate >= 60 && heart_rate <= 100 
    },
    { 
      name: "Respiratory Rate", 
      value: `${resp_rate} breaths/min`, 
      normal: resp_rate >= 12 && resp_rate <= 20 
    },
    { 
      name: "Body Temperature", 
      value: `${body_temp}°C`, 
      normal: body_temp >= 36.5 && body_temp <= 37.5 
    },
    { 
      name: "Oxygen Saturation", 
      value: `${oxygen_sat}%`, 
      normal: oxygen_sat >= 95 && oxygen_sat <= 100 
    },
    { 
      name: "Blood Pressure", 
      value: `${systolic_bp}/${diastolic_bp} mmHg`, 
      normal: systolic_bp >= 90 && systolic_bp <= 120 && diastolic_bp >= 60 && diastolic_bp <= 80 
    },
    { 
      name: "BMI", 
      value: bmi.toFixed(1), 
      normal: bmi >= 18.5 && bmi <= 24.9 
    }
  ];
  
  // Determine risk level and recommendations
  let riskLevel, recommendation;
  
  if (riskScore < 25) {
    riskLevel = "Low Risk";
    recommendation = "This patient is showing low risk. Regular follow-up recommended as per standard protocols.";
  } else if (riskScore < 75) {
    riskLevel = "Medium Risk";
    recommendation = "This patient is showing moderate risk. Consider scheduling a follow-up within the next week to monitor their condition.";
  } else {
    riskLevel = "High Risk";
    recommendation = "This patient is showing signs of elevated risk. Consider immediate clinical review and potential interventions based on their vital signs.";
  }
  
  // Generate suggested actions based on risk level
  const suggestedActions = generateSuggestedActions(riskScore, riskFactors);
  
  return {
    riskScore,
    riskLevel,
    recommendation,
    riskFactors: riskFactors.filter(factor => factor.value), // Only return true risk factors
    vitals,
    suggestedActions
  };
}

/**
 * Generates suggested actions based on risk score and factors
 * @param {number} riskScore - The calculated risk score
 * @param {Array} riskFactors - Array of risk factors
 * @returns {Array} - Array of suggested actions
 */
function generateSuggestedActions(riskScore, riskFactors) {
  const actions = [];
  
  // Basic actions for all patients
  actions.push({
    icon: "graph-up",
    text: "Monitor vitals regularly"
  });
  
  // Risk level specific actions
  if (riskScore >= 25) {
    actions.push({
      icon: "clipboard-plus",
      text: "Schedule follow-up"
    });
  }
  
  if (riskScore >= 50) {
    actions.push({
      icon: "journal-medical",
      text: "Review medication"
    });
  }
  
  if (riskScore >= 75) {
    actions.push({
      icon: "hospital",
      text: "Consider hospital admission"
    });
  }
  
  // Factor specific actions
  const hasBPIssue = riskFactors.some(f => 
    f.name.includes("Blood Pressure") && f.value);
    
  const hasOxygenIssue = riskFactors.some(f => 
    f.name.includes("Oxygen") && f.value);
    
  const hasBMIIssue = riskFactors.some(f => 
    (f.name === "Obesity" || f.name === "Underweight") && f.value);
  
  if (hasBPIssue) {
    actions.push({
      icon: "heart-pulse",
      text: "Blood pressure management"
    });
  }
  
  if (hasOxygenIssue) {
    actions.push({
      icon: "lungs",
      text: "Respiratory assessment"
    });
  }
  
  if (hasBMIIssue) {
    actions.push({
      icon: "universal-access",
      text: "Nutrition consultation"
    });
  }
  
  // Limit to 5 most important actions
  return actions.slice(0, 5);
}

/**
 * Calculates derived measurements from basic vital signs
 * @param {Object} patientData - Object containing patient vital data
 * @returns {Object} - Updated patient data with derived measurements
 */
export function calculateDerivedMeasurements(patientData) {
  const updatedData = { ...patientData };
  
  // Calculate BMI if weight and height are available
  if (patientData.weight && patientData.height) {
    updatedData.bmi = parseFloat((patientData.weight / (patientData.height * patientData.height)).toFixed(1));
  }
  
  // Calculate pulse pressure
  if (patientData.systolic_bp && patientData.diastolic_bp) {
    updatedData.pulse_pressure = patientData.systolic_bp - patientData.diastolic_bp;
  }
  
  // Calculate MAP (Mean Arterial Pressure)
  if (patientData.systolic_bp && patientData.diastolic_bp) {
    updatedData.map = parseFloat((((2 * patientData.diastolic_bp) + patientData.systolic_bp) / 3).toFixed(1));
  }
  
  return updatedData;
}

/**
 * Generates a downloadable report
 * @param {Object} assessmentData - Complete assessment data
 * @returns {void} - Triggers download
 */
export function generateReport(assessmentData) {
  const { id, name, timestamp, riskScore, riskLevel, vitals } = assessmentData;
  
  const reportDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric'
  });
  
  const reportContent = `
Patient Risk Assessment Report
----------------------------
Date: ${reportDate}
Patient: ${name}
Patient ID: ${id}

RISK ASSESSMENT
----------------------------
Risk Score: ${riskScore}%
Risk Level: ${riskLevel}

VITAL SIGNS
----------------------------
Heart Rate: ${vitals.heart_rate} BPM
Respiratory Rate: ${vitals.resp_rate} breaths/min
Body Temperature: ${vitals.body_temp}°C
Oxygen Saturation: ${vitals.oxygen_sat}%
Blood Pressure: ${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg
BMI: ${vitals.bmi}

Generated by HealthRisk Assessment Tool
  `;
  
  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `risk-assessment-${id}-${reportDate}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Saves assessment data to localStorage and Firestore
 * @param {Object} assessmentData - Complete assessment data
 * @returns {Promise<string|null>} - Returns document ID if successfully saved
 */
export async function saveAssessment(assessmentData) {
  try {
    // Check if user is authenticated
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to save assessment data");
    }
    
    const userId = user.uid;
    
    // Save to localStorage with user ID to maintain user separation even offline
    const storageKey = `patientRecords_${userId}`;
    const existingRecords = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Add userId to the assessment data
    const userAssessmentData = {
      ...assessmentData,
      userId,
      timestamp: assessmentData.timestamp || new Date().toISOString()
    };
    
    localStorage.setItem(storageKey, JSON.stringify([...existingRecords, userAssessmentData]));
    
    // Save to Firestore
    const { saveAssessmentToFirestore } = await import('./firebaseFirestore');
    const docId = await saveAssessmentToFirestore(userAssessmentData);
    console.log('Assessment saved to Firestore with ID:', docId);
    return docId;
  } catch (error) {
    console.error('Error saving assessment:', error);
    
    // If error is due to authentication, store in pending sync queue
    if (error.message.includes("authenticated")) {
      const pendingSyncs = JSON.parse(localStorage.getItem('pendingSyncs') || '[]');
      pendingSyncs.push({
        type: 'assessment',
        data: assessmentData,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pendingSyncs', JSON.stringify(pendingSyncs));
      console.log('Assessment added to pending sync queue');
    }
    
    return null;
  }
}

/**
 * Retrieves assessment history for the current user
 * Returns Firestore data if available, otherwise falls back to localStorage
 * @returns {Promise<Array>} - Array of saved assessment records
 */
export async function getAssessmentHistory() {
  try {
    // Get current user
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to retrieve assessment history");
    }
    
    const userId = user.uid;
    
    // Try to get data from Firestore first
    const { getLatestAssessments } = await import('./firebaseFirestore');
    const firestoreData = await getLatestAssessments(100);
    
    if (firestoreData && firestoreData.length > 0) {
      return firestoreData;
    }
    
    // Fall back to localStorage if Firestore failed or returned no data
    // Use user-specific storage key
    const storageKey = `patientRecords_${userId}`;
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch (error) {
    console.error('Error fetching assessment history:', error);
    
    // If error is due to auth, return empty array rather than all users' data
    if (error.message.includes("authenticated")) {
      return [];
    }
    
    // Last-resort fallback to localStorage without user filtering
    // This is a security concern and should be fixed
    console.warn('Falling back to unfiltered localStorage. This is a security risk.');
    return [];
  }
}

/**
 * Gets statistics from Firestore or local storage for the current user
 * @returns {Promise<Object>} - Statistics object
 */
export async function getStatistics() {
  try {
    // Check authentication
    const { user } = await getCurrentUser();
    if (!user) {
      throw new Error("User must be authenticated to retrieve statistics");
    }
    
    const userId = user.uid;
    
    // Try to get statistics from Firestore
    const { getFirestoreStatistics } = await import('./firebaseFirestore');
    const firestoreStats = await getFirestoreStatistics();
    
    if (firestoreStats && firestoreStats.total > 0) {
      return firestoreStats;
    }
    
    // Fall back to localStorage calculations for this specific user
    const storageKey = `patientRecords_${userId}`;
    const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Filter records to only include those for the current user
    const userRecords = records.filter(record => record.userId === userId);
    
    const total = userRecords.length;
    const lowRisk = userRecords.filter(r => r.riskScore < 25).length;
    const mediumRisk = userRecords.filter(r => r.riskScore >= 25 && r.riskScore < 75).length;
    const highRisk = userRecords.filter(r => r.riskScore >= 75).length;
    
    // Calculate change from previous month
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const lastMonthRecords = userRecords.filter(r => new Date(r.timestamp) >= lastMonth);
    
    const lastMonthLow = lastMonthRecords.filter(r => r.riskScore < 25).length;
    const lastMonthMedium = lastMonthRecords.filter(r => r.riskScore >= 25 && r.riskScore < 75).length;
    const lastMonthHigh = lastMonthRecords.filter(r => r.riskScore >= 75).length;
    
    // Calculate trends
    let totalTrend = 0;
    let lowTrend = 0;
    let mediumTrend = 0;
    let highTrend = 0;
    
    // Only calculate trends if we have data from last month
    if (lastMonthRecords.length > 0) {
      totalTrend = ((total - lastMonthRecords.length) / lastMonthRecords.length) * 100 || 0;
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
    console.error('Error getting statistics:', error);
    
    // Return default stats on error instead of potentially exposing other users' data
    return {
      total: 0,
      lowRisk: 0,
      mediumRisk: 0,
      highRisk: 0,
      trend: { total: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0 }
    };
  }
}

/**
 * Syncs pending assessments when a user signs in
 * @returns {Promise<void>}
 */
export async function syncPendingAssessments() {
  try {
    // Check if user is authenticated
    const { user } = await getCurrentUser();
    if (!user) {
      return; // Do nothing if not authenticated
    }
    
    const pendingSyncs = JSON.parse(localStorage.getItem('pendingSyncs') || '[]');
    if (pendingSyncs.length === 0) {
      return; // No pending syncs
    }
    
    const userId = user.uid;
    const { saveAssessmentToFirestore } = await import('./firebaseFirestore');
    
    // Process each pending assessment
    const syncPromises = pendingSyncs
      .filter(item => item.type === 'assessment')
      .map(async (item) => {
        // Add user ID to each assessment
        const userAssessmentData = {
          ...item.data,
          userId,
          timestamp: item.data.timestamp || item.timestamp
        };
        
        try {
          await saveAssessmentToFirestore(userAssessmentData);
          return { success: true, item };
        } catch (error) {
          console.error('Failed to sync assessment:', error);
          return { success: false, item };
        }
      });
    
    const results = await Promise.all(syncPromises);
    
    // Remove successfully synced items
    const newPendingSyncs = pendingSyncs.filter((item, index) => {
      const result = results.find(r => r.item === item);
      return !result || !result.success;
    });
    
    localStorage.setItem('pendingSyncs', JSON.stringify(newPendingSyncs));
    console.log(`Synced ${results.filter(r => r.success).length} pending assessments`);
  } catch (error) {
    console.error('Error syncing pending assessments:', error);
  }
}