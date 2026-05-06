import { Search, MapPin, Droplet, Phone, Navigation, Filter, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import { parseCSV, Hospital } from '../utils/csvParser';

export function FindBlood() {
  const [bloodBanks, setBloodBanks] = useState<Hospital[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadBloodBanks = async () => {
      try {
        const response = await fetch('/pune_blood_banks_10.csv');
        const csvText = await response.text();
        const banks = parseCSV(csvText);
        setBloodBanks(banks);
        setFilteredBanks(banks);
        setLoading(false);
      } catch (error) {
        console.error('Error loading blood banks:', error);
        setLoading(false);
      }
    };

    loadBloodBanks();
  }, []);

  const handleSearch = () => {
    let filtered = bloodBanks;

    if (searchLocation.trim()) {
      filtered = filtered.filter(bank =>
        bank.name.toLowerCase().includes(searchLocation.toLowerCase()) ||
        bank.address.toLowerCase().includes(searchLocation.toLowerCase()) ||
        bank.pincode.includes(searchLocation)
      );
    }

    if (selectedType) {
      filtered = filtered.filter(bank =>
        bank.type.toLowerCase().includes(selectedType.toLowerCase())
      );
    }

    setFilteredBanks(filtered);
  };

  useEffect(() => {
    // Clamp current page when filtered results change so pagination stays valid
    const last = Math.max(1, Math.ceil(filteredBanks.length / itemsPerPage));
    setCurrentPage((prev) => Math.min(prev, last));
  }, [filteredBanks, itemsPerPage]);

  const lastPage = Math.max(1, Math.ceil(filteredBanks.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBanks = filteredBanks.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Blood Banks</h1>
          <p className="text-gray-600">Search for blood banks in Pune and check their details</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Type</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All Types</option>
                <option value="Private">Private</option>
                <option value="Government">Government</option>
                <option value="Trust">Trust</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by Name/Address/Pincode</label>
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Enter name, address or pincode"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex items-end">
              <button 
                onClick={handleSearch}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Results List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Blood Banks {filteredBanks.length > 0 && `(${filteredBanks.length})`}
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-red-600 animate-spin" />
                <span className="ml-2 text-gray-600">Loading blood banks...</span>
              </div>
            ) : filteredBanks.length > 0 ? (
              <>
                {paginatedBanks.map((bank) => (
                  <div key={bank.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-2">{bank.name}</h3>
                        <div className="flex flex-col gap-2 text-sm text-gray-600 mb-3">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{bank.address}</span>
                          </div>
                          <div className="ml-6 text-xs text-gray-500">Pincode: {bank.pincode}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full border border-green-300 whitespace-nowrap">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                        <span className="text-xs font-semibold">Available</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 p-3 bg-gray-50 rounded">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <a href={`tel:${bank.phone}`} className="hover:text-red-600 transition-colors">
                        {bank.phone}
                      </a>
                    </div>

                    <div className="mb-4 text-xs text-gray-500 px-3 py-2">
                      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {bank.type}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-md text-sm font-medium border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                  >
                    Previous
                  </button>

                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {lastPage}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                    disabled={currentPage === lastPage}
                    className={`px-4 py-2 rounded-md text-sm font-medium border ${currentPage === lastPage ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Droplet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No blood banks found matching your search criteria</p>
              </div>
            )}
          </div>

          {/* Map Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-24">
              <div className="p-4 bg-gradient-to-r from-red-600 to-red-700 text-white">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Statistics
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="text-sm text-red-700 font-medium">Total Blood Banks</div>
                  <div className="text-3xl font-bold text-red-600 mt-1">{bloodBanks.length}</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-700 font-medium">Results Found</div>
                  <div className="text-3xl font-bold text-blue-600 mt-1">{filteredBanks.length}</div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Bank Types</h4>
                  <div className="space-y-2 text-sm">
                    {['Private', 'Government', 'Trust', 'Corporate'].map(type => {
                      const count = bloodBanks.filter(b => b.type.includes(type)).length;
                      return count > 0 ? (
                        <div key={type} className="flex items-center justify-between text-gray-600">
                          <span>{type}</span>
                          <span className="font-semibold text-gray-900">{count}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}