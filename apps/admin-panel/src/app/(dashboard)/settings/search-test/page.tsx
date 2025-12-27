'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Script from 'next/script';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

declare global {
  interface Window {
    google: any;
  }
}

export default function SearchTestPage() {
  const [searchText, setSearchText] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Settings
  const [language, setLanguage] = useState('ar');
  const [debounceMs, setDebounceMs] = useState(100);
  const [minChars, setMinChars] = useState(1);
  const [country, setCountry] = useState('qa');
  const [useCountryRestriction, setUseCountryRestriction] = useState(true);
  const [useBias, setUseBias] = useState(true);
  const [biasLat, setBiasLat] = useState('25.2854');
  const [biasLng, setBiasLng] = useState('51.5310');
  const [biasRadius, setBiasRadius] = useState('50000');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Initialize Google services when script loads
  const initializeServices = useCallback(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      // Create a dummy div for PlacesService (required by Google)
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
      setIsScriptLoaded(true);
      addLog('Google Places API initialized');
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchText.length < minChars) {
      setPredictions([]);
      return;
    }

    if (!isScriptLoaded) {
      addLog('Waiting for Google API to load...');
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(searchText);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchText, debounceMs, minChars, isScriptLoaded]);

  const fetchPredictions = async (input: string) => {
    if (!autocompleteServiceRef.current) {
      setError('Google Places API not loaded');
      return;
    }

    setLoading(true);
    setError(null);
    const startTime = performance.now();

    addLog(`Fetching: ${input} (lang=${language}, country=${useCountryRestriction ? country : 'none'})`);

    const request: any = {
      input,
      language,
    };

    if (useCountryRestriction && country) {
      request.componentRestrictions = { country: country };
    }

    if (useBias) {
      request.location = new window.google.maps.LatLng(parseFloat(biasLat), parseFloat(biasLng));
      request.radius = parseInt(biasRadius);
    }

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (results: any[], status: string) => {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        setResponseTime(duration);
        setLoading(false);

        addLog(`Response: ${status} - ${results?.length || 0} results in ${duration}ms`);

        if (status === 'OK' && results) {
          setPredictions(results);
        } else if (status === 'ZERO_RESULTS') {
          setPredictions([]);
          addLog('No results found');

          // Try without country restriction
          if (useCountryRestriction) {
            addLog('Trying without country restriction...');
            const fallbackRequest = { input, language };
            autocompleteServiceRef.current.getPlacePredictions(
              fallbackRequest,
              (fallbackResults: any[], fallbackStatus: string) => {
                if (fallbackStatus === 'OK' && fallbackResults?.length > 0) {
                  setPredictions(fallbackResults);
                  addLog(`Fallback found ${fallbackResults.length} results`);
                }
              }
            );
          }
        } else {
          setError(`API Error: ${status}`);
          addLog(`Error: ${status}`);
        }
      }
    );
  };

  const getPlaceDetails = async (placeId: string) => {
    if (!placesServiceRef.current) return;

    addLog(`Getting details for place: ${placeId}`);

    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ['geometry', 'formatted_address', 'name'],
        language,
      },
      (result: any, status: string) => {
        if (status === 'OK' && result) {
          addLog(`Place: ${result.name || result.formatted_address}`);
          addLog(`Location: ${result.geometry?.location?.lat()}, ${result.geometry?.location?.lng()}`);
        } else {
          addLog(`Error getting details: ${status}`);
        }
      }
    );
  };

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=${language}`}
        onLoad={initializeServices}
        strategy="afterInteractive"
      />

      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Google Places Autocomplete Test</h1>

        {!isScriptLoaded && (
          <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded-lg">
            Loading Google Places API...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Search */}
          <div className="space-y-4">
            {/* Search Input */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <label className="block text-sm font-medium mb-2">Search Input</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Type to search places..."
                className="w-full px-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
                dir="auto"
              />
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                {loading && <span className="text-blue-500">Loading...</span>}
                {responseTime !== null && <span>Response: {responseTime}ms</span>}
                {predictions.length > 0 && <span>{predictions.length} results</span>}
              </div>
              {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
            </div>

            {/* Results */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="px-4 py-3 border-b font-medium">Results</h3>
              <div className="max-h-96 overflow-y-auto">
                {predictions.length === 0 && !loading && (
                  <p className="p-4 text-gray-500">No results. Start typing to search.</p>
                )}
                {predictions.map((prediction) => (
                  <div
                    key={prediction.place_id}
                    onClick={() => getPlaceDetails(prediction.place_id)}
                    className="px-4 py-3 border-b hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <p className="font-medium" dir="auto">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </p>
                    <p className="text-sm text-gray-500" dir="auto">
                      {prediction.structured_formatting?.secondary_text || ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {prediction.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-4">
            {/* Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-medium mb-4">Settings</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="ar">Arabic (ar)</option>
                    <option value="en">English (en)</option>
                    <option value="ar-QA">Arabic Qatar (ar-QA)</option>
                  </select>
                  <p className="text-xs text-orange-500 mt-1">Reload page after changing</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Debounce (ms)</label>
                  <input
                    type="number"
                    value={debounceMs}
                    onChange={(e) => setDebounceMs(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Min Characters</label>
                  <input
                    type="number"
                    value={minChars}
                    onChange={(e) => setMinChars(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="qa, sa, ae..."
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useCountryRestriction}
                    onChange={(e) => setUseCountryRestriction(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Use country restriction</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useBias}
                    onChange={(e) => setUseBias(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Use location bias</span>
                </label>
              </div>

              {useBias && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs mb-1">Lat</label>
                    <input
                      type="text"
                      value={biasLat}
                      onChange={(e) => setBiasLat(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Lng</label>
                    <input
                      type="text"
                      value={biasLng}
                      onChange={(e) => setBiasLng(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Radius (m)</label>
                    <input
                      type="text"
                      value={biasRadius}
                      onChange={(e) => setBiasRadius(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Tips for Better Results</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Set debounce to 0-100ms for fastest response</li>
                <li>• Use min chars = 1 to start searching immediately</li>
                <li>• Arabic works best with language = "ar"</li>
                <li>• Location bias helps prioritize nearby results</li>
                <li>• Country restriction limits to specific country only</li>
              </ul>
            </div>

            {/* Logs */}
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-white">Logs</h3>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div className="h-48 overflow-y-auto font-mono text-xs text-green-400 space-y-1">
                {logs.length === 0 && <p className="text-gray-500">No logs yet...</p>}
                {logs.map((log, i) => (
                  <p key={i}>{log}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* API Key Info */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            API Key: {GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.slice(0, 10)}...` : 'Not configured'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env
          </p>
        </div>
      </div>
    </>
  );
}
