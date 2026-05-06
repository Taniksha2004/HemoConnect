import { useState } from "react";
import { CheckCircle, AlertCircle, Upload, X } from "lucide-react";
import {
  validatePdfFile,
  fileToBase64,
  createDonorRequest,
  saveDonorRequest,
  DonorEligibilityAnswers,
} from "../utils/donationVerification";

interface BecomeDonorFormData {
  name: string;
  email: string;
  answers: DonorEligibilityAnswers;
  aadhaarFile: File | null;
  medicalFile: File | null;
}

export function BecomeDonor() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<BecomeDonorFormData>({
    name: "",
    email: "",
    answers: {
      healthyToday: false,
      donatedLast3Months: false,
      testedPositive: false,
      pregnantOrBreastfeeding: false,
      chronicIllness: false,
    },
    aadhaarFile: null,
    medicalFile: null,
  });

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAnswerChange = (
    question: keyof DonorEligibilityAnswers,
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [question]: value,
      },
    }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "aadhaarFile" | "medicalFile"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [fieldName]: file,
    }));
    setError("");
  };

  const removeFile = (fieldName: "aadhaarFile" | "medicalFile") => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error("Name is required");
      }
      if (!formData.email.trim()) {
        throw new Error("Email is required");
      }
      if (!formData.aadhaarFile) {
        throw new Error("Aadhaar PDF is required");
      }
      if (!formData.medicalFile) {
        throw new Error("Medical Fitness Certificate PDF is required");
      }

      // Convert files to Base64
      const aadhaarBase64 = await fileToBase64(formData.aadhaarFile);
      const medicalBase64 = await fileToBase64(formData.medicalFile);

      // Create donor request object
      const donorRequest = createDonorRequest(
        formData.name,
        formData.email,
        formData.answers,
        aadhaarBase64,
        medicalBase64
      );

      // Save to localStorage
      saveDonorRequest(donorRequest);

      // Show success
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-gray-50 min-h-screen py-12 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for applying to become a donor. Your documents have been
              submitted for verification. Hospital staff will review your
              application and contact you via email soon.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  name: "",
                  email: "",
                  answers: {
                    healthyToday: false,
                    donatedLast3Months: false,
                    testedPositive: false,
                    pregnantOrBreastfeeding: false,
                    chronicIllness: false,
                  },
                  aadhaarFile: null,
                  medicalFile: null,
                });
              }}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Become a Blood Donor
          </h1>
          <p className="text-xl text-gray-600">
            Help save lives by donating blood. Complete this form to start your
            donation journey.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white p-8 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleTextChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleTextChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Eligibility Questions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Eligibility Questions
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please answer all questions honestly. This helps us ensure the
                safety of both donors and recipients.
              </p>

              <div className="space-y-4">
                {/* Question 1 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.answers.healthyToday}
                      onChange={(e) =>
                        handleAnswerChange("healthyToday", e.target.checked)
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-gray-900 font-medium">
                      Are you feeling healthy and fit today?
                    </span>
                  </label>
                </div>

                {/* Question 2 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.answers.donatedLast3Months}
                      onChange={(e) =>
                        handleAnswerChange("donatedLast3Months", e.target.checked)
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-gray-900 font-medium">
                      Have you donated blood in the last 3 months?
                    </span>
                  </label>
                </div>

                {/* Question 3 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.answers.testedPositive}
                      onChange={(e) =>
                        handleAnswerChange("testedPositive", e.target.checked)
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-gray-900 font-medium">
                      Have you tested positive for any infectious diseases?
                    </span>
                  </label>
                </div>

                {/* Question 4 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.answers.pregnantOrBreastfeeding}
                      onChange={(e) =>
                        handleAnswerChange(
                          "pregnantOrBreastfeeding",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-gray-900 font-medium">
                      Are you pregnant or breastfeeding?
                    </span>
                  </label>
                </div>

                {/* Question 5 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.answers.chronicIllness}
                      onChange={(e) =>
                        handleAnswerChange("chronicIllness", e.target.checked)
                      }
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-gray-900 font-medium">
                      Do you have any chronic illnesses?
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Required Documents
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload PDF files (max 5MB each) for verification.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aadhaar Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar PDF *
                  </label>
                  {formData.aadhaarFile ? (
                    <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-gray-900 font-medium">
                          {formData.aadhaarFile.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile("aadhaarFile")}
                        className="p-1 hover:bg-green-100 rounded"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <label className="block p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-center hover:bg-gray-50 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload Aadhaar PDF
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, "aadhaarFile")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Medical Certificate Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Fitness Certificate PDF *
                  </label>
                  {formData.medicalFile ? (
                    <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-gray-900 font-medium">
                          {formData.medicalFile.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile("medicalFile")}
                        className="p-1 hover:bg-green-100 rounded"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <label className="block p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-center hover:bg-gray-50 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload Medical Certificate PDF
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, "medicalFile")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ℹ️ Your information is securely stored and will be reviewed by
                hospital staff within 24 hours.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
