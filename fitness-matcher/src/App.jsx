import React, { useState } from 'react';
import geohash from 'ngeohash';

// 1. Raw User Data
const MOCK_USERS = [
  { id: 1, name: "Alex", age: 25, gender: "Male", lat: 28.6139, lon: 77.2090 },    // Delhi
  { id: 2, name: "Sarah", age: 24, gender: "Female", lat: 28.5355, lon: 77.3910 }, // Noida
  { id: 3, name: "John", age: 40, gender: "Male", lat: 28.7041, lon: 77.1025 },    // Delhi
  { id: 4, name: "Priya", age: 26, gender: "Female", lat: 19.0760, lon: 72.8777 }, // Mumbai (Different Geohash)
  { id: 5, name: "Rahul", age: 28, gender: "Male", lat: 28.4595, lon: 77.0266 },   // Gurgaon
  // Adding someone in New York to prove it ignores far places instantly
  { id: 6, name: "Emma", age: 25, gender: "Female", lat: 40.7128, lon: -74.0060 } 
];

// 2. Pre-compute the Geohash Database Index (O(N) done ONCE on server startup)
const GEOHASH_PRECISION = 4; // Approx 39km x 19km grid squares
const MOCK_DB_INDEX = {};

MOCK_USERS.forEach(user => {
  const hash = geohash.encode(user.lat, user.lon, GEOHASH_PRECISION);
  if (!MOCK_DB_INDEX[hash]) {
    MOCK_DB_INDEX[hash] = [];
  }
  MOCK_DB_INDEX[hash].push(user);
});

// Helper for exact distance calculation
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); 
};

export default function App() {
  const myProfile = { name: "You", lat: 28.6200, lon: 77.2000 }; 

  const [preferences, setPreferences] = useState({
    preferredGender: 'Any',
    minAge: 18,
    maxAge: 30,
    maxDistance: 50
  });

  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ totalUsers: MOCK_USERS.length, scannedUsers: 0 });

  const runAlgorithm = () => {
    // 1. Get My Geohash & Neighbors (O(1) operation)
    const myHash = geohash.encode(myProfile.lat, myProfile.lon, GEOHASH_PRECISION);
    const neighborHashes = geohash.neighbors(myHash);
    const hashesToSearch = [myHash, ...neighborHashes]; // Array of 9 strings

    // 2. Retrieve ONLY users in those 9 grids (O(1) lookup per grid)
    let usersToScan = [];
    hashesToSearch.forEach(hash => {
      if (MOCK_DB_INDEX[hash]) {
        usersToScan = [...usersToScan, ...MOCK_DB_INDEX[hash]];
      }
    });

    setStats({ totalUsers: MOCK_USERS.length, scannedUsers: usersToScan.length });

    // 3. Run the exact filters ONLY on this tiny subset
    const results = [];
    for (let user of usersToScan) {
      if (user.age < preferences.minAge || user.age > preferences.maxAge) continue;
      if (preferences.preferredGender !== 'Any' && user.gender !== preferences.preferredGender) continue;
      
      const distance = getDistance(myProfile.lat, myProfile.lon, user.lat, user.lon);
      if (distance <= preferences.maxDistance) {
        results.push({ ...user, distanceAway: distance });
      }
    }
    
    results.sort((a, b) => a.distanceAway - b.distanceAway);
    setMatches(results);
  };

  const containerStyle = { fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '40px auto', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' };
  const inputStyle = { padding: '8px', margin: '5px 0 15px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' };
  const cardStyle = { backgroundColor: 'white', padding: '15px', marginTop: '15px', borderRadius: '8px', borderLeft: '5px solid #00d2d3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>⚡ O(1) Geohash Matcher</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>Your Location: Central Delhi</p>
      
      <div style={{ backgroundColor: '#e1fbfa', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #00d2d3' }}>
        <strong>Efficiency Stats:</strong><br/>
        Total Users in DB: {stats.totalUsers}<br/>
        Users actually checked by CPU: <span style={{ color: 'red', fontWeight: 'bold' }}>{stats.scannedUsers}</span> (Others were ignored instantly via Geohash!)
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <label><b>I am looking for:</b></label>
        <select style={inputStyle} value={preferences.preferredGender} onChange={e => setPreferences({...preferences, preferredGender: e.target.value})}>
          <option value="Any">Any Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label><b>Min Age:</b></label>
            <input type="number" style={inputStyle} value={preferences.minAge} onChange={e => setPreferences({...preferences, minAge: parseInt(e.target.value)})} />
          </div>
          <div style={{ flex: 1 }}>
            <label><b>Max Age:</b></label>
            <input type="number" style={inputStyle} value={preferences.maxAge} onChange={e => setPreferences({...preferences, maxAge: parseInt(e.target.value)})} />
          </div>
        </div>
        <label><b>Maximum Distance (km): {preferences.maxDistance}</b></label>
        <input type="range" min="1" max="200" style={{ width: '100%', margin: '10px 0' }} value={preferences.maxDistance} onChange={e => setPreferences({...preferences, maxDistance: parseInt(e.target.value)})} />
        <button onClick={runAlgorithm} style={{ width: '100%', padding: '12px', backgroundColor: '#00d2d3', color: 'black', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          Run O(1) Search 🚀
        </button>
      </div>
      <div>
        <h3>Compatible Partners ({matches.length})</h3>
        {matches.map(match => (
          <div key={match.id} style={cardStyle}>
            <div>
              <h4 style={{ margin: '0 0 5px 0' }}>{match.name}</h4>
              <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>{match.age} yrs • {match.gender}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '20px' }}>📍</span><br/>
              <strong style={{ color: '#00d2d3' }}>{match.distanceAway} km</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
