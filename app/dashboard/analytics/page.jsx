'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { getLatestAssessments, getFirestoreStatistics, getPatients } from '@/lib/firebaseFirestore';

const Analytics = () => {
    const router = useRouter();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('week');
    const [patientFilter, setPatientFilter] = useState('all');
    const [patients, setPatients] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch data from Firestore
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Get patients
                const patientsData = await getPatients(100);
                const formattedPatients = patientsData.map(patient => ({
                    id: patient.patientId,
                    name: patient.name
                }));
                setPatients(formattedPatients);
                
                // Get assessment records
                const assessmentsData = await getLatestAssessments(1000); // Get more records for filtering
                
                // Format assessment records to match the expected structure
                const formattedRecords = assessmentsData.map(assessment => {
                    // Convert Firestore timestamp to JS Date if needed
                    const timestamp = assessment.timestamp?.toDate?.() || new Date(assessment.timestamp);
                    
                    return {
                        id: assessment.patientId,
                        name: assessment.name || "Unknown",
                        timestamp: timestamp.toISOString(),
                        riskScore: assessment.riskScore || 0,
                        riskLevel: assessment.riskLevel || "Unknown",
                        vitals: assessment.vitals || {
                            heart_rate: 0,
                            resp_rate: 0,
                            oxygen_sat: 0,
                            systolic_bp: 0,
                            diastolic_bp: 0,
                            body_temp: 0,
                            bmi: 0
                        }
                    };
                });
                
                setRecords(formattedRecords);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load data from Firestore");
                
                // Fallback to localStorage if Firebase fails
                const storedRecords = JSON.parse(localStorage.getItem('patientRecords') || '[]');
                setRecords(storedRecords);
                
                // Extract unique patients from localStorage
                const uniquePatients = Array.from(new Set(storedRecords.map(record => record.id)))
                    .map(id => {
                        const patient = storedRecords.find(r => r.id === id);
                        return { id, name: patient?.name || "Unknown" };
                    });
                setPatients(uniquePatients);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const navigateToRecords = () => {
        router.push('/dashboard/records');
    };

    // Filter records by time range and patient
    const getFilteredRecords = () => {
        let filtered = [...records];
        
        // Filter by time range
        const now = new Date();
        if (timeRange === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            filtered = filtered.filter(record => new Date(record.timestamp) >= weekAgo);
        } else if (timeRange === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            filtered = filtered.filter(record => new Date(record.timestamp) >= monthAgo);
        } else if (timeRange === 'quarter') {
            const quarterAgo = new Date();
            quarterAgo.setMonth(now.getMonth() - 3);
            filtered = filtered.filter(record => new Date(record.timestamp) >= quarterAgo);
        }
        
        // Filter by patient
        if (patientFilter !== 'all') {
            filtered = filtered.filter(record => record.id === patientFilter);
        }
        
        return filtered;
    };

    const filteredRecords = getFilteredRecords();

    // Prepare data for charts
    const prepareRiskTrendData = () => {
        const data = filteredRecords
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(record => ({
                date: new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                name: record.name.split(' ')[0],
                riskScore: record.riskScore,
                patientId: record.id
            }));
        return data;
    };

    const prepareRiskDistributionData = () => {
        const countByLevel = filteredRecords.reduce((acc, record) => {
            acc[record.riskLevel] = (acc[record.riskLevel] || 0) + 1;
            return acc;
        }, {});
        
        return [
            { name: 'Low', value: countByLevel['Low'] || 0, color: '#10B981' },
            { name: 'Medium', value: countByLevel['Medium'] || 0, color: '#F59E0B' },
            { name: 'High', value: countByLevel['High'] || 0, color: '#EF4444' }
        ];
    };

    const prepareVitalsTrendData = () => {
        return filteredRecords
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(record => ({
                date: new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                heartRate: record.vitals.heart_rate,
                respiratoryRate: record.vitals.resp_rate,
                oxygenSaturation: record.vitals.oxygen_sat,
                systolicBP: record.vitals.systolic_bp,
                diastolicBP: record.vitals.diastolic_bp
            }));
    };

    const calculateAverageRiskScore = () => {
        if (filteredRecords.length === 0) return 0;
        const sum = filteredRecords.reduce((total, record) => total + record.riskScore, 0);
        return Math.round(sum / filteredRecords.length);
    };

    const calculateHighRiskPercentage = () => {
        if (filteredRecords.length === 0) return 0;
        const highRiskCount = filteredRecords.filter(record => record.riskLevel === 'High').length;
        return Math.round((highRiskCount / filteredRecords.length) * 100);
    };

    const calculateAverageVitals = () => {
        if (filteredRecords.length === 0) return { heart_rate: 0, resp_rate: 0, oxygen_sat: 0 };
        
        const sum = filteredRecords.reduce((total, record) => {
            return {
                heart_rate: total.heart_rate + (record.vitals.heart_rate || 0),
                resp_rate: total.resp_rate + (record.vitals.resp_rate || 0),
                oxygen_sat: total.oxygen_sat + (record.vitals.oxygen_sat || 0)
            };
        }, { heart_rate: 0, resp_rate: 0, oxygen_sat: 0 });
        
        return {
            heart_rate: Math.round(sum.heart_rate / filteredRecords.length),
            resp_rate: Math.round(sum.resp_rate / filteredRecords.length),
            oxygen_sat: Math.round(sum.oxygen_sat / filteredRecords.length)
        };
    };

    const averageVitals = calculateAverageVitals();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-zinc-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">Loading analytics from Firebase...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-zinc-900">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-5xl mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-200">Error Loading Data</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Using fallback data from local storage.</p>
                    <button 
                        className="px-4 py-2 bg-indigo-500 text-white rounded-xl"
                        onClick={() => window.location.reload()}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 overflow-auto" style={{ height: "calc(90vh - 220px)" }}>
            <div className="p-6">
                <div className="flex items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Analytics Dashboard</h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            Track patient risk trends and health metrics
                            {error && <span className="text-yellow-500 ml-2">(Using local data)</span>}
                        </p>
                    </div>
                    <div className="ml-auto flex">
                        <button 
                            className="px-4 py-2 border border-indigo-500 text-indigo-500 rounded-xl flex items-center"
                            onClick={navigateToRecords}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            View Records
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Range</label>
                        <select 
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="quarter">Last 90 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient</label>
                        <select 
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2"
                            value={patientFilter}
                            onChange={(e) => setPatientFilter(e.target.value)}
                        >
                            <option value="all">All Patients</option>
                            {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>{patient.name} ({patient.id})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 dark:bg-opacity-20 text-blue-500 mr-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Assessments</p>
                                <p className="text-2xl font-bold">{filteredRecords.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900 dark:bg-opacity-20 text-indigo-500 mr-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Risk Score</p>
                                <p className="text-2xl font-bold">{calculateAverageRiskScore()}%</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900 dark:bg-opacity-20 text-red-500 mr-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">High Risk %</p>
                                <p className="text-2xl font-bold">{calculateHighRiskPercentage()}%</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 dark:bg-opacity-20 text-green-500 mr-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Unique Patients</p>
                                <p className="text-2xl font-bold">{patients.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h5 className="text-lg font-medium flex items-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Risk Score Trend
                        </h5>
                        <div className="h-64">
                            {filteredRecords.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={prepareRiskTrendData()}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip 
                                            formatter={(value, name) => [`${value}%`, 'Risk Score']}
                                            labelFormatter={(label) => `${label}`}
                                        />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="riskScore" 
                                            name="Risk Score"
                                            stroke="#6366f1" 
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500 dark:text-gray-400">No data available for the selected filters</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h5 className="text-lg font-medium flex items-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                            </svg>
                            Risk Level Distribution
                        </h5>
                        <div className="h-64 flex justify-center items-center">
                            {filteredRecords.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={prepareRiskDistributionData()}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {prepareRiskDistributionData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value, name) => [value, name]} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                    No data available for the selected filters
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 lg:col-span-2">
                        <h5 className="text-lg font-medium flex items-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            Vital Signs Trend
                        </h5>
                        <div className="h-64">
                            {filteredRecords.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={prepareVitalsTrendData()}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line 
                                            type="monotone" 
                                            dataKey="heartRate" 
                                            name="Heart Rate" 
                                            stroke="#EF4444" 
                                            activeDot={{ r: 8 }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="respiratoryRate" 
                                            name="Respiratory Rate" 
                                            stroke="#10B981" 
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="oxygenSaturation" 
                                            name="O2 Saturation" 
                                            stroke="#3B82F6"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500 dark:text-gray-400">No data available for the selected filters</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h5 className="text-lg font-medium flex items-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Average Vital Signs
                        </h5>
                        <div className="space-y-6 mt-4">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Heart Rate</span>
                                    <span className="text-sm font-medium">{averageVitals.heart_rate} BPM</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div 
                                        className="bg-red-500 h-2.5 rounded-full" 
                                        style={{ width: `${Math.min(100, (averageVitals.heart_rate / 200) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Respiratory Rate</span>
                                    <span className="text-sm font-medium">{averageVitals.resp_rate} breaths/min</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div 
                                        className="bg-green-500 h-2.5 rounded-full" 
                                        style={{ width: `${Math.min(100, (averageVitals.resp_rate / 30) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm text-gray-500 dark::text-gray-400">Oxygen Saturation</span>
                                    <span className="text-sm font-medium">{averageVitals.oxygen_sat}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div 
                                        className="bg-blue-500 h-2.5 rounded-full" 
                                        style={{ width: `${Math.min(100, (averageVitals.oxygen_sat / 100) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h6 className="text-base font-medium mb-2">Patient Risk Summary</h6>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-green-100 dark:bg-green-900 dark:bg-opacity-20 p-2 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Low Risk</p>
                                    <p className="font-medium text-green-600 dark:text-green-400">
                                        {filteredRecords.filter(r => r.riskLevel === 'Low').length}
                                    </p>
                                </div>
                                <div className="bg-orange-100 dark:bg-orange-900 dark:bg-opacity-20 p-2 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Medium</p>
                                    <p className="font-medium text-orange-600 dark:text-orange-400">
                                        {filteredRecords.filter(r => r.riskLevel === 'Medium').length}
                                    </p>
                                </div>
                                <div className="bg-red-100 dark:bg-red-900 dark:bg-opacity-20 p-2 rounded-lg">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">High Risk</p>
                                    <p className="font-medium text-red-600 dark:text-red-400">
                                        {filteredRecords.filter(r => r.riskLevel === 'High').length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;