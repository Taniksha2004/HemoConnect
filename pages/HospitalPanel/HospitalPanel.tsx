import { CheckCircle, XCircle, Clock, Users, Droplet, Activity, Search, Filter, AlertCircle, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  getDonorRequests,
  approveDonorRequest,
  rejectDonorRequest,
  openPdfInNewTab,
  DonorRequest,
  onDonorRequestsChange,
} from '../utils/donationVerification';

interface User {
  name: string;
  role: 'donor' | 'requestor' | 'hospital' | null;
  verified: boolean;
  bloodType?: string;
}

interface HospitalPanelProps {
  user: User | null;
}

interface PendingRequest {
  id: string;
  patientName: string;
  bloodType: string;
  unitsNeeded: number;
  urgency: 'critical' | 'high' | 'normal';
  requestor: string;
  submittedAt: string;
  documentsUploaded: boolean;
}

export function HospitalPanel({ user }: HospitalPanelProps) {
  const [donorRequests, setDonorRequests] = useState<DonorRequest[]>([]);
  const [bloodRequests, setBloodRequests] = useState<any[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [bloodRejectingId, setBloodRejectingId] = useState<string | null>(null);
  const [bloodRejectionReason, setBloodRejectionReason] = useState("");
  const [error, setError] = useState<string>("");
  const [newRequestNotification, setNewRequestNotification] = useState<string | null>(null);
  const [previewingPdfFile, setPreviewingPdfFile] = useState<string | null>(null);
  const [previewingFileName, setPreviewingFileName] = useState<string | null>(null);
  const [previewingIsImage, setPreviewingIsImage] = useState<boolean>(false);

  // Load donor requests on component mount and listen for real-time updates
  useEffect(() => {
    let previousCount = getDonorRequests().length;

    // Set up real-time listener for donor request changes
    const unsubscribe = onDonorRequestsChange((requests) => {
      setDonorRequests(requests);
      
      // Show notification if new request arrived
      if (requests.length > previousCount) {
        const newCount = requests.length - previousCount;
        setNewRequestNotification(`${newCount} new donor request(s) received!`);
        
        // Play notification sound if available
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==');
          audio.play().catch(() => {/* Silently ignore if audio won't play */});
        } catch (e) {
          // Silently ignore audio errors
        }

        previousCount = requests.length;

        // Clear notification after 5 seconds
        setTimeout(() => {
          setNewRequestNotification(null);
        }, 5000);
      }
    });

    // Cleanup listener on component unmount
    return unsubscribe;
  }, []);

  // Poll for blood requests stored in localStorage (frontend-only)
  useEffect(() => {
    let last = localStorage.getItem('bloodRequests') || '[]';
    try {
      setBloodRequests(JSON.parse(last));
    } catch (e) {
      setBloodRequests([]);
    }

    const intervalId = setInterval(() => {
      try {
        const current = localStorage.getItem('bloodRequests') || '[]';
        if (current !== last) {
          last = current;
          setBloodRequests(JSON.parse(current));
        }
      } catch (e) {
        // ignore
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  if (!user || user.role !== 'hospital') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This area is only accessible to authorized hospital staff.</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleApprove = (id: string) => {
    const success = approveDonorRequest(id);
    if (success) {
      setDonorRequests(getDonorRequests());
      setError("");
    } else {
      setError("Failed to approve request. Please try again.");
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectionReason("");
  };

  const handleRejectConfirm = () => {
    if (!rejectingId) return;

    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }

    const success = rejectDonorRequest(rejectingId, rejectionReason);
    if (success) {
      setDonorRequests(getDonorRequests());
      setRejectingId(null);
      setRejectionReason("");
      setError("");
    } else {
      setError("Failed to reject request. Please try again.");
    }
  };

  const handleViewPdf = (requestId: string, fileType: 'prescription' | 'idProof', meta: any) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const blobUrl = window.__hemoBlobs?.[requestId]?.[fileType];
    
    if (!blobUrl) {
      setError('File not available in session. Please refresh or resubmit the request.');
      return;
    }

    // detect type from stored metadata
    const isPdf = meta?.type === 'application/pdf';
    setPreviewingPdfFile(blobUrl);
    setPreviewingFileName(meta?.name || `${fileType}.pdf`);
    setPreviewingIsImage(!isPdf);
  };

  const handleViewDonorFile = (base64Content: string, fileName: string) => {
    if (!base64Content) {
      setError('File not available');
      return;
    }
    try {
      // Determine if it's a PDF or image based on file type
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      const dataUri = isPdf ? `data:application/pdf;base64,${base64Content}` : `data:image/*;base64,${base64Content}`;
      setPreviewingPdfFile(dataUri);
      setPreviewingFileName(fileName);
      setPreviewingIsImage(!isPdf);
    } catch (error) {
      console.error('Failed to view donor file:', error);
      setError('Failed to load file');
    }
  };

  const openImageInNewTab = (base64Content: string, fileName: string) => {
    try {
      const dataUri = `data:image/*;base64,${base64Content}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.target = '_blank';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to open image:', error);
    }
  };

  const approveBloodRequest = (id: string) => {
    try {
      const KEY = 'bloodRequests';
      const data = localStorage.getItem(KEY) || '[]';
      const arr = JSON.parse(data);
      const req = arr.find((r: any) => r.id === id);
      if (!req) return false;
      req.status = 'Approved';
      req.rejectionReason = '';
      localStorage.setItem(KEY, JSON.stringify(arr));
      setBloodRequests(arr);
      return true;
    } catch (e) {
      console.error('Failed to approve blood request', e);
      return false;
    }
  };

  const rejectBloodRequest = (id: string, reason: string) => {
    try {
      const KEY = 'bloodRequests';
      const data = localStorage.getItem(KEY) || '[]';
      const arr = JSON.parse(data);
      const req = arr.find((r: any) => r.id === id);
      if (!req) return false;
      req.status = 'Rejected';
      req.rejectionReason = reason;
      localStorage.setItem(KEY, JSON.stringify(arr));
      setBloodRequests(arr);
      return true;
    } catch (e) {
      console.error('Failed to reject blood request', e);
      return false;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hospital Panel</h1>
              <p className="text-gray-600 mt-1">{user.name}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Real-time monitoring active
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user.verified && (
                <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border border-green-300">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Verified Organization</span>
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-red-700 font-medium">Pending Verifications</div>
                  <div className="text-2xl font-bold text-red-900">
                    {donorRequests.filter((r) => r.status === "Pending").length}
                  </div>
                </div>
                <Clock className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-700 font-medium">Approved Donors</div>
                  <div className="text-2xl font-bold text-green-900">
                    {donorRequests.filter((r) => r.status === "Approved").length}
                  </div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-700 font-medium">Rejected Donors</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {donorRequests.filter((r) => r.status === "Rejected").length}
                  </div>
                </div>
                <XCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-purple-700 font-medium">Total Applications</div>
                  <div className="text-2xl font-bold text-purple-900">{donorRequests.length}</div>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* New Request Notification */}
        {newRequestNotification && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 animate-pulse">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 font-semibold">{newRequestNotification}</p>
          </div>
        )}

        {/* Main Content: Two Columns - Left: Pending Blood Requests, Right: Pending Donor Verifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Pending Blood Requests */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Pending Blood Requests</h2>
              <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {/* Blood requests from localStorage */}
            {bloodRequests.length === 0 ? (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="text-center py-12">
                    <Droplet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No pending blood requests available.</p>
                    <p className="text-sm text-gray-400 mt-2">When blood requests are submitted they will appear here for review.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bloodRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{req.patientName || 'Unnamed Patient'}</h3>
                        <div className="text-sm text-gray-600">
                          <p>Blood Type: {req.bloodType}</p>
                          <p>Units: {req.units}</p>
                          <p>Hospital: {req.hospital || req.hospitalName || '-'}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{req.createdAt || req.createdAt}</p>
                        <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(req.status || 'Pending')}`}>
                          {getStatusIcon(req.status || 'Pending')}
                          {req.status || 'Pending'}
                        </span>
                      </div>
                    </div>

                    {req.additionalInfo && (
                      <div className="mb-3 text-sm text-gray-700">{req.additionalInfo}</div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {req.prescriptionFileMeta && (
                        <button
                          onClick={() => handleViewPdf(req.id, 'prescription', req.prescriptionFileMeta)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                        >
                          View Prescription
                        </button>
                      )}

                      {req.idProofFileMeta && (
                        <button
                          onClick={() => handleViewPdf(req.id, 'idProof', req.idProofFileMeta)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                        >
                          View ID Proof
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const ok = approveBloodRequest(req.id);
                          if (!ok) setError('Failed to approve blood request');
                        }}
                        disabled={req.status && req.status !== 'Pending'}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${req.status === 'Pending' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => {
                          setBloodRejectingId(req.id);
                          setBloodRejectionReason('');
                        }}
                        disabled={req.status && req.status !== 'Pending'}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${req.status === 'Pending' ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'border border-gray-300 text-gray-500 cursor-not-allowed'}`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Pending Donor Verifications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Pending Donor Verifications</h2>
              <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {donorRequests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No donor applications yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {donorRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-gray-900">
                            {request.name}
                          </h3>
                          <span
                            className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border uppercase ${getStatusBadgeColor(
                              request.status
                            )}`}
                          >
                            {getStatusIcon(request.status)}
                            {request.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Email: {request.email}</p>
                          <p>ID: {request.id}</p>
                          <p>Submitted: {request.submittedAt}</p>
                        </div>
                      </div>
                    </div>

                    {/* Eligibility Answers */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                        Eligibility Answers:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Healthy Today:</span>
                          <span
                            className={`font-semibold ${
                              request.answers.healthyToday
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {request.answers.healthyToday ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Donated Last 3 Months:</span>
                          <span
                            className={`font-semibold ${
                              request.answers.donatedLast3Months
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {request.answers.donatedLast3Months ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Tested Positive:</span>
                          <span
                            className={`font-semibold ${
                              request.answers.testedPositive
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {request.answers.testedPositive ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Pregnant/Breastfeeding:</span>
                          <span
                            className={`font-semibold ${
                              request.answers.pregnantOrBreastfeeding
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {request.answers.pregnantOrBreastfeeding ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Chronic Illness:</span>
                          <span
                            className={`font-semibold ${
                              request.answers.chronicIllness
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {request.answers.chronicIllness ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rejection Reason (if applicable) */}
                    {request.status === "Rejected" && request.rejectionReason && (
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-semibold text-red-900 mb-1 text-sm">
                          Rejection Reason:
                        </h4>
                        <p className="text-red-800 text-sm">{request.rejectionReason}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleViewDonorFile(request.aadhaarFile, `${request.name}-aadhaar.pdf`)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View Aadhaar
                      </button>

                      <button
                        onClick={() =>
                          handleViewDonorFile(request.medicalFile, `${request.name}-medical.pdf`)
                        }
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View Medical Cert
                      </button>

                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={request.status !== "Pending"}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                          request.status === "Pending"
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>

                      <button
                        onClick={() => handleRejectClick(request.id)}
                        disabled={request.status !== "Pending"}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors text-sm ${
                          request.status === "Pending"
                            ? "border border-red-300 text-red-600 hover:bg-red-50"
                            : "border border-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Preview Modal (PDF or Image) */}
      {previewingPdfFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">{previewingFileName}</h3>
              <button
                onClick={() => {
                  setPreviewingPdfFile(null);
                  setPreviewingFileName(null);
                  setPreviewingIsImage(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
              {previewingIsImage ? (
                <img
                  src={previewingPdfFile}
                  alt={previewingFileName || 'Preview'}
                  className="max-w-full max-h-[80vh] rounded"
                />
              ) : (
                <iframe
                  src={previewingPdfFile}
                  title={previewingFileName || 'Document Preview'}
                  className="w-full h-[70vh] border-0 rounded"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 flex gap-2">
              <button
                onClick={() => {
                  setPreviewingPdfFile(null);
                  setPreviewingFileName(null);
                  setPreviewingIsImage(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  try {
                    const link = document.createElement('a');
                    link.href = previewingPdfFile!;
                    link.target = '_blank';
                    link.download = previewingFileName || 'document';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch (e) {
                    console.error('Failed to download file', e);
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Donor Application
            </h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this application:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Medical records incomplete, insufficient documents, etc."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectionReason("");
                  setError("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blood Request Rejection Modal */}
      {bloodRejectingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Blood Request
            </h3>
            <p className="text-gray-600 mb-4">Please provide a reason for rejecting this blood request:</p>
            <textarea
              value={bloodRejectionReason}
              onChange={(e) => setBloodRejectionReason(e.target.value)}
              placeholder="e.g., Incorrect prescription, incomplete details, etc."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBloodRejectingId(null);
                  setBloodRejectionReason('');
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!bloodRejectingId) return;
                  if (!bloodRejectionReason.trim()) {
                    setError('Please provide a reason for rejection.');
                    return;
                  }
                  const ok = rejectBloodRequest(bloodRejectingId, bloodRejectionReason);
                  if (!ok) setError('Failed to reject blood request. Please try again.');
                  setBloodRejectingId(null);
                  setBloodRejectionReason('');
                  setError('');
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
