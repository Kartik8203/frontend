// page.js - Dashboard Page
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  calculateRiskScore,
  calculateDerivedMeasurements,
  generateReport
} from '@/lib/predict';
import { LucideRefreshCcw } from "lucide-react";
import { 
  saveAssessmentToFirestore, 
  getPatients, 
  getLatestAssessments,
  getFirestoreStatistics
} from '@/lib/firebaseFirestore';
import { ToastContainer, toast } from "react-toastify";

export default function DashboardPage() {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [riskFactors, setRiskFactors] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    lowRisk: 0,
    mediumRisk: 0,
    highRisk: 0,
    trend: { total: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0 }
  });
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    heart_rate: 60,
    resp_rate: 12,
    body_temp: 36.0,
    oxygen_sat: 95.0,
    systolic_bp: 110,
    diastolic_bp: 70,
    age: 18,
    gender: 0,
    weight: 50.0,
    height: 1.5,
    hrv: 0.08,
    pulse_pressure: 30,
    bmi: 20.3,
    map: 88.7
  });

  // Generate a patient ID and load data when the component mounts
  useEffect(() => {
    generatePatientId();
    loadStatistics();
    loadRecentPredictions();
  }, []);

  // Load statistics from Firestore
  const loadStatistics = async () => {
    try {
      const stats = await getFirestoreStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load recent predictions from Firestore
  const loadRecentPredictions = async () => {
    try {
      const assessments = await getLatestAssessments(2); // Fetch last 2 assessments
      setRecentPredictions(assessments);
    } catch (error) {
      console.error("Error loading recent predictions:", error);
    }
  };

  useEffect(() => {
    // Calculate derived measurements when primary values change
    const updatedData = calculateDerivedMeasurements(formData);
    setFormData(updatedData);
  }, [formData.height, formData.weight, formData.systolic_bp, formData.diastolic_bp]);

  // Function to generate a unique patient ID
  const generatePatientId = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const prefix = "PAT";
      const timestamp = new Date().getTime().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      const newId = `${prefix}-${timestamp}-${random}`;
      setPatientId(newId);
      setIsGenerating(false);
    }, 1000); // simulate async generation
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!patientName.trim()) {
      alert("Please enter a patient name");
      return;
    }

    // Create a patient ID if not already set
    const patId = patientId || `PAT-${Date.now()}`;

    // Calculate risk assessment using the imported function
    const assessmentResults = calculateRiskScore(formData);

    // Update state with the assessment results
    setRiskScore(assessmentResults.riskScore);
    setRiskLevel(assessmentResults.riskLevel);
    setRecommendation(assessmentResults.recommendation);
    setRiskFactors(assessmentResults.riskFactors);
    setVitals(assessmentResults.vitals);
    setSuggestedActions(assessmentResults.suggestedActions);

    setShowResults(true);

    try {
      // Prepare the assessment data object matching the function signature from firebaseFirestore.js
      const assessmentData = {
        id: patId,
        name: patientName,
        timestamp: new Date().toISOString(),
        riskScore: assessmentResults.riskScore,
        riskLevel: assessmentResults.riskLevel,
        vitals: formData
      };
      
      // Save assessment to Firestore with the correctly structured parameter
      await saveAssessmentToFirestore(assessmentData);
      
      toast("report created successfully!");

      // Update statistics and recent predictions after saving
      await loadStatistics();
      await loadRecentPredictions();
    } catch (error) {
      console.error("Error saving assessment:", error);
      alert("There was an error saving the assessment. Please try again.");
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'gender' ? parseInt(value) : parseFloat(value)
    }));
  };

  const handleClear = () => {
    setPatientName("");
    generatePatientId(); // Generate a new ID
    setFormData({
      heart_rate: 60,
      resp_rate: 12,
      body_temp: 36.0,
      oxygen_sat: 95.0,
      systolic_bp: 110,
      diastolic_bp: 70,
      age: 18,
      gender: 0,
      weight: 50.0,
      height: 1.5,
      hrv: 0.08,
      pulse_pressure: 30,
      bmi: 20.3,
      map: 88.7
    });
  };

  const backToForm = () => {
    setShowResults(false);
    generatePatientId(); // Generate a new ID for the next assessment
  };

  const viewRecords = () => {
    router.push('/dashboard/records');
  };

  const getRiskClass = () => {
    if (riskScore < 25) return "text-green-500";
    if (riskScore < 75) return "text-orange-500";
    return "text-red-500";
  };

  const getRecommendationClass = () => {
    if (riskScore < 25) return "bg-green-500 bg-opacity-10";
    if (riskScore < 75) return "bg-orange-500 bg-opacity-10";
    return "bg-red-500 bg-opacity-10";
  };

  const getRiskLabel = () => {
    if (riskScore < 25) return "Low Risk";
    if (riskScore < 75) return "Medium Risk";
    return "High Risk";
  };

  const getRiskBadgeClass = (riskLevel) => {
    if (riskLevel === "Low Risk" || riskLevel < 25) return "bg-green-500";
    if (riskLevel === "Medium Risk" || (riskLevel >= 25 && riskLevel < 75)) return "bg-orange-500";
    return "bg-red-500";
  };

  const getRecommendationText = () => {
    if (riskScore < 25) {
      return "This patient is showing low risk. Regular follow-up recommended as per standard protocols.";
    } else if (riskScore < 75) {
      return "This patient is showing moderate risk. Consider scheduling a follow-up within the next week to monitor their condition.";
    } else {
      return "This patient is showing signs of elevated risk. Consider immediate clinical review and potential interventions based on their vital signs.";
    }
  };

  const downloadReport = () => {
    generateReport(
      { patientName, patientId },
      {
        riskScore,
        riskLevel,
        recommendation,
        riskFactors
      },
      formData
    );
  };

  // Format timestamp from Firestore
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";
    
    // If timestamp is a Firestore Timestamp, convert to JS Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Calculate how long ago
    const now = new Date();
    const diffMs = now - date;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) return "Just now";
    if (diffHrs === 1) return "1 hour ago";
    return `${diffHrs} hours ago`;
  };

  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 overflow-auto" style={{ height: "calc(90vh - 220px)" }}>
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="flex items-center mb-8">
          <button
            className="btn btn-outline-secondary mr-3 lg:hidden"
            onClick={() => setShowSidebar(true)}
          >
            <i className="bi bi-list"></i>
          </button>
          <div>
            <h2 className="text-2xl font-bold mb-1">Patient Risk Prediction</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-0">Analyze patient vitals to predict health risks</p>
          </div>
          <div className="ml-auto flex">
            <button
              className="px-4 py-2 border border-indigo-500 text-indigo-500 rounded-xl mr-2 flex items-center hover:bg-blue-50"
              onClick={viewRecords}
            >
              <i className="bi bi-folder mr-2"></i>View Records
            </button>
          </div>
        </div>

        {/* Input Form Section */}
        {!showResults && (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <h5 className="text-lg font-medium flex items-center mb-6">
                    <i className="bi bi-clipboard-data mr-2 text-indigo-500"></i>
                    Enter Patient Information
                  </h5>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="patientName" className="block text-sm font-medium mb-1">Patient Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="patientName"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="patientId" className="block text-sm font-medium mb-1">Patient ID (Auto-generated)</label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          id="patientId"
                          value={patientId}
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={generatePatientId}
                          className="ml-2 px-3 py-3 bg-indigo-100 dark:bg-indigo-900 rounded-xl text-indigo-500"
                          title="Generate New ID"
                        >
                          <LucideRefreshCcw
                            size={18}
                            className={isGenerating ? "animate-spin" : ""}
                          />
                        </button>

                      </div>
                    </div>
                    <div>
                      <label htmlFor="heart_rate" className="block text-sm font-medium mb-1">Heart Rate (BPM)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="heart_rate"
                        name="heart_rate"
                        value={formData.heart_rate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="resp_rate" className="block text-sm font-medium mb-1">Respiratory Rate</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="resp_rate"
                        name="resp_rate"
                        value={formData.resp_rate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="body_temp" className="block text-sm font-medium mb-1">Body Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="body_temp"
                        name="body_temp"
                        value={formData.body_temp}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="oxygen_sat" className="block text-sm font-medium mb-1">Oxygen Saturation (%)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="oxygen_sat"
                        name="oxygen_sat"
                        value={formData.oxygen_sat}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="systolic_bp" className="block text-sm font-medium mb-1">Blood Pressure (Systolic)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="systolic_bp"
                        name="systolic_bp"
                        value={formData.systolic_bp}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="diastolic_bp" className="block text-sm font-medium mb-1">Blood Pressure (Diastolic)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="diastolic_bp"
                        name="diastolic_bp"
                        value={formData.diastolic_bp}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="age" className="block text-sm font-medium mb-1">Age</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="age"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium mb-1">Gender</label>
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="0">Male</option>
                        <option value="1">Female</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="weight" className="block text-sm font-medium mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="weight"
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="height" className="block text-sm font-medium mb-1">Height (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="height"
                        name="height"
                        value={formData.height}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="hrv" className="block text-sm font-medium mb-1">HRV</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        id="hrv"
                        name="hrv"
                        value={formData.hrv}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="md:col-span-2 mt-4">
                      <button type="submit" className="px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition">
                        <i className="bi bi-calculator mr-2"></i>Predict Risk
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        onClick={handleClear}
                      >
                        <i className="bi bi-trash mr-2"></i>Clear
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <h5 className="text-lg font-medium flex items-center mb-6">
                    <i className="bi bi-info-circle mr-2 text-indigo-500"></i>
                    Guidelines
                  </h5>
                  <div className="bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20 p-4 rounded-lg">
                    <h6 className="text-base font-medium"><i className="bi bi-lightbulb mr-2"></i>Reference Ranges</h6>
                    <ul className="ml-5 mt-2 space-y-1 text-sm">
                      <li><strong>Blood Pressure:</strong> 90-120/60-80 mmHg</li>
                      <li><strong>Heart Rate:</strong> 60-100 BPM</li>
                      <li><strong>Respiratory Rate:</strong> 12-20 breaths/min</li>
                      <li><strong>Temperature:</strong> 36.5-37.5°C</li>
                      <li><strong>O₂ Saturation:</strong> 95-100%</li>
                      <li><strong>BMI:</strong> 18.5-24.9 kg/m²</li>
                    </ul>
                  </div>
                  <div className="mt-6">
                    <h6 className="mb-3 font-medium">Recent Predictions</h6>
                    {isLoading ? (
                      <div className="flex justify-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      </div>
                    ) : recentPredictions.length > 0 ? (
                      recentPredictions.map((prediction, index) => (
                        <div key={index} className="flex items-center mb-2 p-2 rounded bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20">
                          <div className="mr-3">
                            <span className={`px-2 py-1 ${getRiskBadgeClass(prediction.riskLevel)} text-white text-xs rounded-full`}>
                              {prediction.riskLevel === "Low Risk" || prediction.riskScore < 25 ? "Low" : 
                              prediction.riskLevel === "Medium Risk" || (prediction.riskScore >= 25 && prediction.riskScore < 75) ? "Medium" : "High"}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{prediction.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(prediction.timestamp)}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 italic p-2">No recent assessments</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {showResults && (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h5 className="text-lg font-medium flex items-center">
                        <i className="bi bi-clipboard-check mr-2 text-indigo-500"></i>
                        Risk Assessment Results
                      </h5>
                      <p className="text-sm text-gray-500 mt-1">Patient: {patientName} (ID: {patientId})</p>
                    </div>
                    <button
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm rounded-xl flex items-center"
                      onClick={backToForm}
                    >
                      <i className="bi bi-arrow-left mr-2"></i>New Prediction
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex flex-col items-center">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{
                          background: `conic-gradient(from 0deg, currentColor ${riskScore}%, transparent 0)`,
                          color: riskScore < 25 ? '#10b981' : riskScore < 75 ? '#f59e0b' : '#ef4444'
                        }}></div>
                        <div className="absolute inset-3 bg-white dark:bg-gray-800 rounded-full"></div>
                        <span className={`relative text-3xl font-bold ${getRiskClass()}`}>{riskScore}%</span>
                      </div>
                      <h4 className={`mt-4 mb-1 text-xl font-medium ${getRiskClass()}`}>{getRiskLabel()}</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {new Date().toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric'
                        })}
                      </p>
                    </div>

                    <div>
                      <div className={`rounded-lg p-4 ${getRecommendationClass()}`}>
                        <h6 className="text-base font-medium"><i className="bi bi-clipboard2-pulse mr-2"></i>Clinical Recommendation</h6>
                        <p className="mt-2 text-sm">
                          {getRecommendationText()}
                        </p>
                        <div className="mt-3 flex">
                          <button
                            className="px-3 py-1 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition mr-2"
                            onClick={downloadReport}
                          >
                            <i className="bi bi-download mr-2"></i>Download Report
                          </button>
                          <button
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            onClick={viewRecords}
                          >
                            <i className="bi bi-folder mr-2"></i>View All Records
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="my-6 border-gray-200 dark:border-gray-700" />

                  <h6 className="mb-4 font-medium">Patient Vitals Summary</h6>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {vitals.map((vital, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{vital.name}</div>
                        <div className="mt-1 font-medium flex items-center">
                          {vital.value}
                          {vital.normal ? (
                            <i className="bi bi-check-circle text-green-500 ml-2"></i>
                          ) : (
                            <i className="bi bi-exclamation-circle text-red-500 ml-2"></i>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <h5 className="text-lg font-medium flex items-center mb-6">
                    <i className="bi bi-activity mr-2 text-indigo-500"></i>
                    Risk Factors
                  </h5>
                  <ul className="space-y-2">
                    {riskFactors.map((factor, index) => (
                      <li key={index} className={`p-3 rounded-lg flex items-center ${factor.value ? 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20 text-red-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
                        <i className={`bi ${factor.value ? 'bi-x-circle' : 'bi-check-circle'} mr-2`}></i>
                        <span className={factor.value ? '' : 'text-gray-500 dark:text-gray-400'}>
                          {factor.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <h6 className="mb-3 font-medium">Suggested Actions</h6>
                    <div className="flex items-center mb-2 p-2 rounded bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20">
                      <div className="mr-3">
                        <i className="bi bi-graph-up text-indigo-500"></i>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Monitor vitals regularly</div>
                      </div>
                    </div>
                    {suggestedActions.map((action, index) => (
                      <div key={index} className="flex items-center mb-2 p-2 rounded bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20">
                        <div className="mr-3">
                          <i className={`bi ${action.icon} text-indigo-500`}></i>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{action.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{action.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Section - Show regardless of results */}
        <div className="mt-8">
          <h5 className="text-lg font-medium mb-6">
            <i className="bi bi-bar-chart-line mr-2 text-indigo-500"></i>
            Assessment Statistics
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Total Assessments</p>
                  <h4 className="text-2xl font-bold">{statistics.total}</h4>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full">
                  <i className="bi bi-clipboard-data text-indigo-500"></i>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {statistics.trend.total > 0 ? (
                  <span className="text-green-500"><i className="bi bi-arrow-up mr-1"></i>{statistics.trend.total}% from last week</span>
                ) : (
                  <span className="text-red-500"><i className="bi bi-arrow-down mr-1"></i>{Math.abs(statistics.trend.total)}% from last week</span>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Low Risk</p>
                  <h4 className="text-2xl font-bold text-green-500">{statistics.lowRisk}</h4>
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <i className="bi bi-heart-pulse text-green-500"></i>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {statistics.trend.lowRisk > 0 ? (
                  <span className="text-green-500"><i className="bi bi-arrow-up mr-1"></i>{statistics.trend.lowRisk}% from last week</span>
                ) : (
                  <span className="text-red-500"><i className="bi bi-arrow-down mr-1"></i>{Math.abs(statistics.trend.lowRisk)}% from last week</span>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Medium Risk</p>
                  <h4 className="text-2xl font-bold text-orange-500">{statistics.mediumRisk}</h4>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                  <i className="bi bi-exclamation-triangle text-orange-500"></i>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {statistics.trend.mediumRisk > 0 ? (
                  <span className="text-green-500"><i className="bi bi-arrow-up mr-1"></i>{statistics.trend.mediumRisk}% from last week</span>
                ) : (
                  <span className="text-red-500"><i className="bi bi-arrow-down mr-1"></i>{Math.abs(statistics.trend.mediumRisk)}% from last week</span>
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">High Risk</p>
                  <h4 className="text-2xl font-bold text-red-500">{statistics.highRisk}</h4>
                </div>
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
                  <i className="bi bi-shield-exclamation text-red-500"></i>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {statistics.trend.highRisk > 0 ? (
                  <span className="text-green-500"><i className="bi bi-arrow-up mr-1"></i>{statistics.trend.highRisk}% from last week</span>
                ) : (
                  <span className="text-red-500"><i className="bi bi-arrow-down mr-1"></i>{Math.abs(statistics.trend.highRisk)}% from last week</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}