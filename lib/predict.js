// predict.js - Risk Prediction Functions

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
 * @returns {Promise<void>}
 */
export async function saveAssessment(assessmentData) {
  // Save to localStorage for offline access
  const existingRecords = JSON.parse(localStorage.getItem('patientRecords') || '[]');
  localStorage.setItem('patientRecords', JSON.stringify([...existingRecords, assessmentData]));
  
  // If we're online, also save to Firestore
  try {
    // Import is done dynamically to avoid circular dependencies
    const { saveAssessmentToFirestore } = await import('./firebaseFirestore');
    const docId = await saveAssessmentToFirestore(assessmentData);
    console.log('Assessment saved to Firestore with ID:', docId);
    return docId;
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    return null;
  }
}

/**
 * Retrieves assessment history from local storage
 * Returns Firestore data if available, otherwise falls back to localStorage
 * @returns {Promise<Array>} - Array of saved assessment records
 */
export async function getAssessmentHistory() {
  try {
    // Try to get data from Firestore first
    const { getLatestAssessments } = await import('./firebaseFirestore');
    const firestoreData = await getLatestAssessments(100);
    
    if (firestoreData && firestoreData.length > 0) {
      return firestoreData;
    }
    
    // Fall back to localStorage if Firestore failed or returned no data
    return JSON.parse(localStorage.getItem('patientRecords') || '[]');
  } catch (error) {
    console.error('Error fetching from Firestore, falling back to localStorage:', error);
    return JSON.parse(localStorage.getItem('patientRecords') || '[]');
  }
}

/**
 * Gets statistics from Firestore or local storage
 * @returns {Promise<Object>} - Statistics object
 */
export async function getStatistics() {
  try {
    // Try to get statistics from Firestore
    const { getFirestoreStatistics } = await import('./firebaseFirestore');
    const firestoreStats = await getFirestoreStatistics();
    
    if (firestoreStats && firestoreStats.total > 0) {
      return firestoreStats;
    }
    
    // Fall back to localStorage calculations if Firestore has no data
    const records = JSON.parse(localStorage.getItem('patientRecords') || '[]');
    
    const total = records.length;
    const lowRisk = records.filter(r => r.riskScore < 25).length;
    const mediumRisk = records.filter(r => r.riskScore >= 25 && r.riskScore < 75).length;
    const highRisk = records.filter(r => r.riskScore >= 75).length;
    
    // Calculate change from previous month
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const lastMonthRecords = records.filter(r => new Date(r.timestamp) >= lastMonth);
    
    // This is a placeholder calculation - in a real app this would be more sophisticated
    const trend = {
      total: 12,  // Percentage growth from last month
      lowRisk: 5,
      mediumRisk: 0,
      highRisk: -3
    };
    
    return {
      total,
      lowRisk,
      mediumRisk, 
      highRisk,
      trend
    };
  } catch (error) {
    console.error('Error getting Firestore statistics, falling back to localStorage:', error);
    
    // Fall back to localStorage calculations
    const records = JSON.parse(localStorage.getItem('patientRecords') || '[]');
    
    const total = records.length;
    const lowRisk = records.filter(r => r.riskScore < 25).length;
    const mediumRisk = records.filter(r => r.riskScore >= 25 && r.riskScore < 75).length;
    const highRisk = records.filter(r => r.riskScore >= 75).length;
    
    const trend = {
      total: 12,
      lowRisk: 5,
      mediumRisk: 0,
      highRisk: -3
    };
    
    return {
      total,
      lowRisk,
      mediumRisk, 
      highRisk,
      trend
    };
  }
}