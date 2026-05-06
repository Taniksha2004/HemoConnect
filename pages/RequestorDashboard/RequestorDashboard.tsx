import { useState, useEffect } from 'react';
import { AlertCircle, Upload, FileText, Clock, CheckCircle2, Users, Droplet, MapPin, Phone, X, Eye } from 'lucide-react';

interface User {
  name: string;
  role: 'donor' | 'requestor' | 'hospital' | null;
  verified: boolean;
  bloodType?: string;
}

interface RequestorDashboardProps {
  user: User | null;
}

interface FileMeta {
  name: string;
  size: number;
  type: string;
}

interface BloodRequest {
  id: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodType: string;
  units: number;
  hospitalName: string;
  hospitalAddress: string;
  doctorName: string;
  contactNumber: string;
  emergencyLevel: 'Critical' | 'High' | 'Normal';
  // store only metadata in localStorage
  prescriptionFileMeta?: FileMeta | null;
  idProofFileMeta?: FileMeta | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  createdAt: string;
}

// Utility functions for localStorage
const BLOOD_REQUESTS_KEY = 'bloodRequests';

const getBloodRequests = (): BloodRequest[] => {
  try {
    const data = localStorage.getItem(BLOOD_REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to retrieve blood requests:', error);
    return [];
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    // handle quota errors gracefully
    console.error('localStorage.setItem failed', err);
    return false;
  }
};

const saveBloodRequest = (request: BloodRequest): void => {
  const requests = getBloodRequests();
  requests.push(request);
  const serialized = JSON.stringify(requests);
  const ok = safeSetItem(BLOOD_REQUESTS_KEY, serialized);
  if (!ok) {
    throw new Error('Failed to save blood request: localStorage quota exceeded. Please clear some stored requests.');
  }
};

export function RequestorDashboard({ user }: RequestorDashboardProps) {
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [submittedRequest, setSubmittedRequest] = useState<BloodRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState('');
  
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: '',
    bloodType: '',
    units: '',
    hospitalName: '',
    hospitalAddress: '',
    doctorName: '',
    contactNumber: '',
    emergencyLevel: '',
    prescriptionFile: null as File | null,
    idProofFile: null as File | null,
  });

  const [prescriptionFileName, setPrescriptionFileName] = useState('');
  const [idProofFileName, setIdProofFileName] = useState('');

  // Poll localStorage for updates to the submitted request (when Hospital Panel approves/rejects)
  useEffect(() => {
    if (!submittedRequest) return;

    let lastData = localStorage.getItem(BLOOD_REQUESTS_KEY) || '[]';
    
    const intervalId = setInterval(() => {
      try {
        const currentData = localStorage.getItem(BLOOD_REQUESTS_KEY) || '[]';
        if (currentData !== lastData) {
          lastData = currentData;
          const requests = JSON.parse(currentData);
          const updatedRequest = requests.find((r: BloodRequest) => r.id === submittedRequest.id);
          
          if (updatedRequest && (updatedRequest.status !== submittedRequest.status)) {
            // Status changed - update the submitted request
            setSubmittedRequest(updatedRequest);
          }
        }
      } catch (e) {
        console.error('Error polling blood requests:', e);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [submittedRequest]);

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
        return <CheckCircle2 className="w-4 h-4" />;
      case 'Rejected':
        return <X className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Login</h2>
          <p className="text-gray-600">You need to be logged in to request blood.</p>
        </div>
      </div>
    );
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const validatePdfFile = (file: File): { valid: boolean; error?: string } => {
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'Prescription must be a PDF file' };
    }
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must not exceed 1MB' };
    }
    return { valid: true };
  };

  const validateIdProofFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'ID Proof must be PDF or Image (JPG, PNG)' };
    }
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must not exceed 1MB' };
    }
    return { valid: true };
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePrescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setErrors((prev) => ({
        ...prev,
        prescriptionFile: validation.error || 'Invalid file',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      prescriptionFile: file,
    }));
    setPrescriptionFileName(file.name);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.prescriptionFile;
      return newErrors;
    });
  };

  const handleIdProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateIdProofFile(file);
    if (!validation.valid) {
      setErrors((prev) => ({
        ...prev,
        idProofFile: validation.error || 'Invalid file',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      idProofFile: file,
    }));
    setIdProofFileName(file.name);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.idProofFile;
      return newErrors;
    });
  };

  const removePrescriptionFile = () => {
    setFormData((prev) => ({
      ...prev,
      prescriptionFile: null,
    }));
    setPrescriptionFileName('');
  };

  const removeIdProofFile = () => {
    setFormData((prev) => ({
      ...prev,
      idProofFile: null,
    }));
    setIdProofFileName('');
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient Name is required';
    }
    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      newErrors.age = 'Please enter a valid age';
    }
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    if (!formData.bloodType) {
      newErrors.bloodType = 'Blood Type is required';
    }
    if (!formData.units) {
      newErrors.units = 'Units Required is required';
    } else if (parseInt(formData.units) < 1) {
      newErrors.units = 'Units must be at least 1';
    }
    if (!formData.hospitalName.trim()) {
      newErrors.hospitalName = 'Hospital Name is required';
    }
    if (!formData.hospitalAddress.trim()) {
      newErrors.hospitalAddress = 'Hospital Address is required';
    }
    if (!formData.doctorName.trim()) {
      newErrors.doctorName = 'Doctor Name is required';
    }
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact Number is required';
    }
    if (!formData.emergencyLevel) {
      newErrors.emergencyLevel = 'Emergency Level is required';
    }
    if (!formData.prescriptionFile) {
      newErrors.prescriptionFile = 'Prescription PDF is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (loading) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Instead of converting to base64 (which is large), create object URLs for preview
      // and store only metadata in localStorage.
      const id = `REQ-${Date.now()}`;

      // create global in-memory map to hold blob URLs for the current session
      // window.__hemoBlobs = { [requestId]: { prescription?: string, idProof?: string, prescriptionName?: string, idProofName?: string } }
      // This keeps previews working without storing large base64 strings in localStorage.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.__hemoBlobs = window.__hemoBlobs || {};

      const presFile = formData.prescriptionFile!;
      const presUrl = presFile ? URL.createObjectURL(presFile) : null;
      const idProofFile = formData.idProofFile;
      const idProofUrl = idProofFile ? URL.createObjectURL(idProofFile) : null;

      // store blob URLs in session map
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.__hemoBlobs[id] = {
        prescription: presUrl,
        prescriptionName: presFile?.name || null,
        idProof: idProofUrl,
        idProofName: idProofFile?.name || null,
      };

      // Create blood request object with metadata only
      const newRequest: BloodRequest = {
        id,
        patientName: formData.patientName,
        age: parseInt(formData.age),
        gender: formData.gender as 'Male' | 'Female' | 'Other',
        bloodType: formData.bloodType,
        units: parseInt(formData.units),
        hospitalName: formData.hospitalName,
        hospitalAddress: formData.hospitalAddress,
        doctorName: formData.doctorName,
        contactNumber: formData.contactNumber,
        emergencyLevel: formData.emergencyLevel as 'Critical' | 'High' | 'Normal',
        prescriptionFileMeta: presFile
          ? { name: presFile.name, size: presFile.size, type: presFile.type }
          : null,
        idProofFileMeta: idProofFile
          ? { name: idProofFile.name, size: idProofFile.size, type: idProofFile.type }
          : null,
        status: 'Pending',
        createdAt: new Date().toLocaleString(),
      };

      // Save to localStorage (only metadata)
      saveBloodRequest(newRequest);

      // Update UI
      setSubmittedRequest(newRequest);
      setShowCreateForm(false);

      // Reset form
      setFormData({
        patientName: '',
        age: '',
        gender: '',
        bloodType: '',
        units: '',
        hospitalName: '',
        hospitalAddress: '',
        doctorName: '',
        contactNumber: '',
        emergencyLevel: '',
        prescriptionFile: null,
        idProofFile: null,
      });
      setPrescriptionFileName('');
      setIdProofFileName('');
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Failed to submit request'
      );
    }
    finally {
      setLoading(false);
    }
  };

  const getEmergencyColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const openPdfInNewTab = (blobUrl: string | null, fileName: string) => {
    if (!blobUrl) {
      alert('File not available');
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const openImageInNewTab = (blobUrl: string | null, fileName: string) => {
    if (!blobUrl) {
      alert('File not available');
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  // If form is not shown and no request is submitted, show initial card
  if (!showCreateForm && !submittedRequest) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Request Blood</h1>
            <p className="text-xl text-gray-600">
              Submit a blood request to find compatible donors
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="text-center">
              <Droplet className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Create New Blood Request
              </h3>
              <p className="text-gray-600 mb-8">
                Fill in the blood request form to find compatible donors for your patient.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Start Request Form
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If request is submitted, show the card
  if (submittedRequest && !showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Request Submitted</h1>
            <p className="text-xl text-gray-600">
              Your blood request has been successfully submitted
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Request #{submittedRequest.id}
                </h3>
                <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(submittedRequest.status)}`}>
                  {getStatusIcon(submittedRequest.status)}
                  {submittedRequest.status.toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="text-gray-900 font-semibold">{submittedRequest.createdAt}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                  Patient Name
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {submittedRequest.patientName}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                  Blood Type
                </p>
                <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-red-600" />
                  {submittedRequest.bloodType}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                  Units Required
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {submittedRequest.units} units
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                  Hospital Name
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {submittedRequest.hospitalName}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                  Emergency Level
                </p>
                <span
                  className={`inline-block px-4 py-2 text-sm font-semibold rounded-full border ${getEmergencyColor(
                    submittedRequest.emergencyLevel
                  )}`}
                >
                  {submittedRequest.emergencyLevel}
                </span>
              </div>
            </div>

            {/* Hospital Address */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-semibold uppercase mb-2">
                Hospital Address
              </p>
              <p className="text-gray-900 flex items-start gap-2">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                {submittedRequest.hospitalAddress}
              </p>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="text-xs text-green-700 font-semibold uppercase mb-1">
                  Doctor Name
                </p>
                <p className="text-gray-900 font-semibold">{submittedRequest.doctorName}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-semibold uppercase mb-1">
                  Contact Number
                </p>
                <p className="text-gray-900 font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {submittedRequest.contactNumber}
                </p>
              </div>
            </div>

            {/* Rejection Reason (if applicable) */}
            {submittedRequest.status === 'Rejected' && submittedRequest.rejectionReason && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2 text-sm">Rejection Reason:</h4>
                <p className="text-red-800 text-sm">{submittedRequest.rejectionReason}</p>
              </div>
            )}            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {submittedRequest.prescriptionFileMeta && (
                <button
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const blobUrl = window.__hemoBlobs?.[submittedRequest.id]?.prescription;
                    openPdfInNewTab(
                      blobUrl,
                      submittedRequest.prescriptionFileMeta?.name || 'prescription.pdf'
                    );
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Prescription
                </button>
              )}

              {submittedRequest.idProofFileMeta && (
                <button
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const blobUrl = window.__hemoBlobs?.[submittedRequest.id]?.idProof;
                    openImageInNewTab(
                      blobUrl,
                      submittedRequest.idProofFileMeta?.name || 'idproof'
                    );
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View ID Proof
                </button>
              )}

              <button
                onClick={() => {
                  setShowCreateForm(true);
                  setSubmittedRequest(null);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Create Another Request
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ℹ️ Your request has been submitted and is now being processed. Donors
                matching your blood type will be notified. You will receive updates via
                your registered contact number and email.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show form
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Blood Request
          </h1>
          <p className="text-xl text-gray-600">
            Fill in all the required information to request blood
          </p>
        </div>

        {/* Error Alert */}
        {generalError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{generalError}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Patient Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Patient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.patientName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Full name"
                  />
                  {errors.patientName && (
                    <p className="mt-1 text-sm text-red-600">{errors.patientName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.age ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="25"
                    min="1"
                    max="120"
                  />
                  {errors.age && (
                    <p className="mt-1 text-sm text-red-600">{errors.age}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.gender ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Blood Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Blood Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Type Needed *
                  </label>
                  <select
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.bloodType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  {errors.bloodType && (
                    <p className="mt-1 text-sm text-red-600">{errors.bloodType}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Units Required *
                  </label>
                  <input
                    type="number"
                    name="units"
                    value={formData.units}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.units ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="2"
                    min="1"
                  />
                  {errors.units && (
                    <p className="mt-1 text-sm text-red-600">{errors.units}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Hospital Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Hospital Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    name="hospitalName"
                    value={formData.hospitalName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.hospitalName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="City General Hospital"
                  />
                  {errors.hospitalName && (
                    <p className="mt-1 text-sm text-red-600">{errors.hospitalName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor Name *
                  </label>
                  <input
                    type="text"
                    name="doctorName"
                    value={formData.doctorName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.doctorName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Dr. Sarah Johnson"
                  />
                  {errors.doctorName && (
                    <p className="mt-1 text-sm text-red-600">{errors.doctorName}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hospital Address *
                  </label>
                  <input
                    type="text"
                    name="hospitalAddress"
                    value={formData.hospitalAddress}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.hospitalAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="123 Medical Center Blvd, City, State 12345"
                  />
                  {errors.hospitalAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.hospitalAddress}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      errors.contactNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.contactNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Emergency Details
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Level *
                </label>
                <select
                  name="emergencyLevel"
                  value={formData.emergencyLevel}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.emergencyLevel ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Emergency Level</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                </select>
                {errors.emergencyLevel && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergencyLevel}</p>
                )}
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Required Documents
              </h3>

              {/* Prescription Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Prescription (PDF only) *
                </label>
                {formData.prescriptionFile ? (
                  <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-gray-900 font-medium">
                        {prescriptionFileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removePrescriptionFile}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ) : (
                  <label className="block p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-center hover:bg-gray-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload Prescription PDF
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePrescriptionChange}
                      className="hidden"
                    />
                  </label>
                )}
                {errors.prescriptionFile && (
                  <p className="mt-1 text-sm text-red-600">{errors.prescriptionFile}</p>
                )}
              </div>

              {/* ID Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload ID Proof (PDF/Image) – Optional but Recommended
                </label>
                {formData.idProofFile ? (
                  <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-gray-900 font-medium">
                        {idProofFileName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeIdProofFile}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ) : (
                  <label className="block p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-center hover:bg-gray-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload ID Proof (PDF, JPG, PNG)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleIdProofChange}
                      className="hidden"
                    />
                  </label>
                )}
                {errors.idProofFile && (
                  <p className="mt-1 text-sm text-red-600">{errors.idProofFile}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    patientName: '',
                    age: '',
                    gender: '',
                    bloodType: '',
                    units: '',
                    hospitalName: '',
                    hospitalAddress: '',
                    doctorName: '',
                    contactNumber: '',
                    emergencyLevel: '',
                    prescriptionFile: null,
                    idProofFile: null,
                  });
                  setPrescriptionFileName('');
                  setIdProofFileName('');
                  setErrors({});
                }}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={(e) => handleSubmit(e as any)}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ℹ️ All information will be securely stored and used only for blood
                matching purposes. Hospital staff will review your request and contact
                you within 24 hours.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
