'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getLatestAssessments, getPatientAssessments,deleteAssessment } from '@/lib/firebaseFirestore';

export default function RecordsPage() {
    const router = useRouter();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
    const [error, setError] = useState(null);
    const [deleteStatus, setDeleteStatus] = useState({ isDeleting: false, message: null, isError: false });

    useEffect(() => {
        async function fetchFirestoreData() {
            try {
                // Fetch real data from Firestore
                const firestoreRecords = await getLatestAssessments(100);
                
                if (firestoreRecords && firestoreRecords.length > 0) {
                    // Format the records to match our expected structure
                    const formattedRecords = firestoreRecords.map(record => ({
                        id: record.patientId || 'Unknown ID',
                        name: record.name || 'Unknown',
                        timestamp: record.timestamp ? record.timestamp.toDate().toISOString() : new Date().toISOString(),
                        riskScore: record.riskScore || 0,
                        riskLevel: getRiskLevelFromScore(record.riskScore),
                        vitals: record.vitals || {
                            heart_rate: 0,
                            resp_rate: 0,
                            body_temp: 0,
                            oxygen_sat: 0,
                            systolic_bp: 0,
                            diastolic_bp: 0,
                            bmi: 0
                        },
                        firestoreId: record.id // Save Firestore doc ID for reference
                    }));
                    
                    setRecords(formattedRecords);
                } else {
                    // If no Firestore data, check localStorage as fallback
                    const storedRecords = JSON.parse(localStorage.getItem('patientRecords') || '[]');
                    if (storedRecords.length > 0) {
                        setRecords(storedRecords);
                    } else {
                        setError("No patient records found in database");
                    }
                }
            } catch (err) {
                console.error("Error fetching Firestore data:", err);
                setError("Error loading patient data: " + err.message);
                
                // Fallback to localStorage
                const storedRecords = JSON.parse(localStorage.getItem('patientRecords') || '[]');
                if (storedRecords.length > 0) {
                    setRecords(storedRecords);
                }
            } finally {
                setLoading(false);
            }
        }
        
        fetchFirestoreData();
    }, []);

    const getRiskLevelFromScore = (score) => {
        if (score < 25) return "Low";
        if (score < 75) return "Medium";
        return "High";
    };

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const filteredRecords = records.filter(record => {
        return (
            (record.name && record.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (record.id && record.id.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedRecords = [...filteredRecords].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const getStatusClass = (riskLevel) => {
        switch (riskLevel) {
            case 'Low':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-500';
            case 'Medium':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:bg-opacity-20 dark:text-orange-500';
            case 'High':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-500';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const viewPatientDetails = async (record) => {
        // If we want to load all assessments for this patient for additional context
        try {
            // Get detailed patient assessments from Firebase
            if (record.id && record.id !== 'Unknown ID') {
                const patientAssessments = await getPatientAssessments(record.id);
                
                // Optional: You could store these in state if you want to show history
                console.log('Patient assessment history:', patientAssessments);
            }
        } catch (error) {
            console.error("Error fetching patient assessments:", error);
        }
        
        setSelectedRecord(record);
    };

    const closeDetails = () => {
        setSelectedRecord(null);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const navigateToDashboard = () => {
        router.push('/dashboard');
    };

    const deleteRecord = async (record) => {
        try {
            // Show deleting status
            setDeleteStatus({ isDeleting: true, message: 'Deleting record...', isError: false });
            
            // Check if this record has a Firestore ID
            if (record.firestoreId) {
                // Delete from Firestore
                await deleteAssessment(record.firestoreId);
                
                // Update local state
                const updatedRecords = records.filter(r => r.firestoreId !== record.firestoreId);
                setRecords(updatedRecords);
                
                // Clear selected record if it was the one deleted
                if (selectedRecord && selectedRecord.firestoreId === record.firestoreId) {
                    setSelectedRecord(null);
                }
                
                setDeleteStatus({ isDeleting: false, message: 'Record deleted successfully', isError: false });
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    setDeleteStatus({ isDeleting: false, message: null, isError: false });
                }, 3000);
            } else {
                // If it's a local record
                const updatedRecords = records.filter(r => r.timestamp !== record.timestamp);
                localStorage.setItem('patientRecords', JSON.stringify(updatedRecords));
                setRecords(updatedRecords);
                
                if (selectedRecord && selectedRecord.timestamp === record.timestamp) {
                    setSelectedRecord(null);
                }
                
                setDeleteStatus({ isDeleting: false, message: 'Local record deleted', isError: false });
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    setDeleteStatus({ isDeleting: false, message: null, isError: false });
                }, 3000);
            }
        } catch (error) {
            console.error("Error deleting record:", error);
            setDeleteStatus({ 
                isDeleting: false, 
                message: `Error deleting record: ${error.message}`, 
                isError: true 
            });
            
            // Clear error message after 5 seconds
            setTimeout(() => {
                setDeleteStatus({ isDeleting: false, message: null, isError: false });
            }, 5000);
        }
    };

    // New function to show confirmation dialog before deleting
    const confirmDelete = (record) => {
        if (window.confirm(`Are you sure you want to delete this assessment for ${record.name}? This action cannot be undone.`)) {
            deleteRecord(record);
        }
    };

    const getBorderColor = (riskLevel) => {
        switch (riskLevel) {
            case 'Low':
                return 'border-green-500';
            case 'Medium':
                return 'border-orange-500';
            case 'High':
                return 'border-red-500';
            default:
                return 'border-gray-300';
        }
    };

    const getTextColor = (riskLevel) => {
        switch (riskLevel) {
            case 'Low':
                return 'text-green-500';
            case 'Medium':
                return 'text-orange-500';
            case 'High':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full bg-white dark:bg-zinc-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">Loading patient records...</p>
                </div>
            </div>
        );
    }


    const chartData = records.slice(0, 7).map(record => ({
        name: record.name ? record.name.split(' ')[0] : 'Unknown',
        riskScore: record.riskScore,
        date: new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })).reverse();

    return (
        <div className="min-h-screen w-full bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 overflow-auto" style={{ height: "calc(90vh - 220px)" }}>
            <div className="p-6 h-full">
                <div className="flex items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Patient Records</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-0">View and manage past risk assessments</p>
                    </div>
                    <div className="ml-auto flex">
                        <button 
                            className="px-4 py-2 border border-indigo-500 text-indigo-500 rounded-xl flex items-center"
                            onClick={navigateToDashboard}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {/* Main content area - flexbox layout for better responsive handling */}
                <div className="flex flex-col lg:flex-row gap-6 h-full">
                    {/* Left content area (grows to fill available space) */}
                    <div className={`flex-grow ${selectedRecord ? 'lg:w-3/4' : 'w-full'}`}>
                        {/* Patient records table */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                                <h5 className="text-lg font-medium flex items-center mb-3 sm:mb-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Recent Risk Assessments
                                </h5>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Search patient..." 
                                        className="px-4 py-2 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 w-full sm:w-auto"
                                        value={searchTerm}
                                        onChange={handleSearch}
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                           

                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-blue-50 rounded-md mb-6 text-black dark:bg-blue-500 dark:text-white border-b border-gray-200 dark:border-gray-600 ">
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer "
                                                onClick={() => handleSort('name')}
                                            >
                                                <div className="flex items-center">
                                                    Patient
                                                    {sortConfig.key === 'name' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('id')}
                                            >
                                                <div className="flex items-center">
                                                    ID
                                                    {sortConfig.key === 'id' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('timestamp')}
                                            >
                                                <div className="flex items-center">
                                                    Date
                                                    {sortConfig.key === 'timestamp' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('riskScore')}
                                            >
                                                <div className="flex items-center">
                                                    Risk Score
                                                    {sortConfig.key === 'riskScore' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('riskLevel')}
                                            >
                                                <div className="flex items-center">
                                                    Status
                                                    {sortConfig.key === 'riskLevel' && (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-1 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {sortedRecords.map((record, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900 dark:text-white">{record.name || 'Unknown'}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{record.id || 'Unknown'}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(record.timestamp)}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className={`text-sm font-medium ${getTextColor(record.riskLevel)}`}>{record.riskScore}%</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(record.riskLevel)}`}>
                                                        {record.riskLevel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                    <button 
                                                        onClick={() => viewPatientDetails(record)}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                                                        disabled={deleteStatus.isDeleting}
                                                    >
                                                        View
                                                    </button>
                                                    <button 
                                                        onClick={() => confirmDelete(record)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                        disabled={deleteStatus.isDeleting}
                                                    >
                                                        {deleteStatus.isDeleting && record.firestoreId === selectedRecord?.firestoreId ? (
                                                            <span className="flex items-center">
                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Deleting...
                                                            </span>
                                                        ) : 'Delete'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {sortedRecords.length === 0 && (
                                <div className="text-center py-6">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="mt-2 text-gray-500 dark:text-gray-400">No records found</p>
                                </div>
                            )}
                        </div>

                        {/* Risk trends chart - only show if no patient is selected or on larger screens */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full">
                            <h5 className="text-lg font-medium flex items-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Recent Risk Trends
                            </h5>
                            {chartData.length > 0 ? (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartData}
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
                                            <Bar 
                                                dataKey="riskScore" 
                                                name="Risk Score" 
                                                fill="#6366f1"
                                                radius={[4, 4, 0, 0]}
                                                barSize={30}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">No chart data available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right content area - Patient details (only visible when a patient is selected) */}
                    {selectedRecord && (
                        <div className="lg:w-1/4 w-full">
                            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 ${getBorderColor(selectedRecord.riskLevel)} sticky top-6`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h5 className="text-lg font-medium flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Patient Details
                                    </h5>
                                    <button 
                                        onClick={closeDetails}
                                        className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <div className="mb-4">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Patient Name</div>
                                        <div className="font-medium">{selectedRecord.name || 'Unknown'}</div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Patient ID</div>
                                        <div className="font-medium">{selectedRecord.id || 'Unknown'}</div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Assessment Date</div>
                                        <div className="font-medium">{formatDate(selectedRecord.timestamp)}</div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h6 className="text-base font-medium mb-4">Risk Assessment</h6>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Risk Score</span>
                                        <span className={`font-medium ${getTextColor(selectedRecord.riskLevel)}`}>{selectedRecord.riskScore}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-3">
                                        <div 
                                            className={`h-2.5 rounded-full ${selectedRecord.riskLevel === 'Low' ? 'bg-green-500' : selectedRecord.riskLevel === 'Medium' ? 'bg-orange-500' : 'bg-red-500'}`} 
                                            style={{ width: `${selectedRecord.riskScore}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Low</span>
                                        <span>Medium</span>
                                        <span>High</span>
                                    </div>
                                </div>

                                <div>
                                    <h6 className="text-base font-medium mb-4">Vital Signs</h6>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Heart Rate</span>
                                            <span className="font-medium">{selectedRecord.vitals.heart_rate} BPM</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Blood Pressure</span>
                                            <span className="font-medium">{selectedRecord.vitals.systolic_bp}/{selectedRecord.vitals.diastolic_bp} mmHg</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Respiratory Rate</span>
                                            <span className="font-medium">{selectedRecord.vitals.resp_rate} breaths/min</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Temperature</span>
                                            <span className="font-medium">{selectedRecord.vitals.body_temp}°C</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Oxygen Saturation</span>
                                            <span className="font-medium">{selectedRecord.vitals.oxygen_sat}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">BMI</span>
                                            <span className="font-medium">{selectedRecord.vitals.bmi}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button 
                                        className="w-full px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition flex items-center justify-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}