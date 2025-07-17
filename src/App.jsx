import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'https://script.google.com/macros/s/AKfycbwLBGijyHEGr1gjIMvb4hzQ88tkCgD_IbwgZ8hqMgMczMpTx2lWvBumO5phTif1erjiJA/exec';

export default function App() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [slots, setSlots] = useState({ visit1: [], visit2: [] });
  const [selectedVisit1, setSelectedVisit1] = useState('');
  const [selectedVisit2, setSelectedVisit2] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const sendOtp = async () => {
    if (!email || !name) {
      setMessage('Please enter both name and email.');
      return;
    }
    setOtpSent(true);
    setTimer(180);
    setMessage(`(DEBUG) OTP is 123456 – This is for testing only.`);
  };

  const verifyOtp = () => {
    if (otp === '123456') {
      setIsVerified(true);
      fetchSlots();
      fetchBooking();
    } else {
      setMessage('Invalid OTP. Use 123456 for testing.');
    }
  };

const fetchSlots = async () => {
  setLoading(true);
  try {
    const res = await axios.get(`${API_BASE}?type=getSlots`);

    // Format slot dates for safety
    const formatSlots = (slots) =>
      slots.map(row => [
        row[0], // Slot ID
        row[1], // Date Label
        row[2], // Time Label
        typeof row[3] === 'string' ? row[3] : new Date(row[3]).toISOString().slice(0, 10),
        row[4]
      ]);

    // Set fresh, clean data
    setSlots({
      visit1: formatSlots(res.data.visit1),
      visit2: formatSlots(res.data.visit2)
    });

    // Clear selections to avoid stale slot errors
    setSelectedVisit1('');
    setSelectedVisit2('');
  } catch (err) {
    setMessage('Failed to fetch slots.');
  }
  setLoading(false);
};


  const fetchBooking = async () => {
    try {
      const res = await axios.get(`${API_BASE}?type=getBooking&email=${email}`);
      setBooking(res.data);
    } catch (err) {
      setMessage('Failed to fetch booking.');
    }
  };

const handleBooking = async () => {
  if (!selectedVisit1 || !selectedVisit2 || !name) {
    setMessage('All fields are required.');
    return;
  }
  setLoading(true);

  try {
    // Extract from dropdown value — formatted as "YYYY-MM-DD|HH:mm"
    const [v1Date, v1Time] = selectedVisit1.split('|').map(s => s.trim());
    const [v2Date, v2Time] = selectedVisit2.split('|').map(s => s.trim());

    // Construct the exact format your backend expects
    const visit1 = `${v1Date}|${v1Time}`;
    const visit2 = `${v2Date}|${v2Time}`;

    // Send to Google Apps Script
    const res = await axios.get(`${API_BASE}?type=submitBooking&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&visit1=${encodeURIComponent(visit1)}&visit2=${encodeURIComponent(visit2)}`);

    setMessage(res.data.success ? 'Booking successful!' : res.data.message || 'Booking failed.');
    if (res.data.success) {
      fetchBooking();
      fetchSlots();
    }
  } catch (err) {
    setMessage('Booking failed. Please try again.');
  }

  setLoading(false);
};


  const cancelBooking = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}?type=cancelBooking&email=${email}`);
      if (res.data.success) {
        setBooking(null);
        setSelectedVisit1('');
        setSelectedVisit2('');
        fetchSlots();
        setMessage('Booking cancelled.');
      } else {
        setMessage('No booking found.');
      }
    } catch (err) {
      setMessage('Failed to cancel booking.');
    }
    setLoading(false);
  };

const formatDate = (dateStr) => {
  if (!dateStr || !dateStr.includes('-')) return 'Invalid Date';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // local time
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};


  const formatTime = (timeStr) => {
    const [hour, minute] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

const renderBookingDetails = () => {
  if (!booking) return null;

console.log('visit1Date:', booking.visit1Date);
console.log('visit1Time:', booking.visit1Time);
console.log('visit2Date:', booking.visit2Date);
console.log('visit2Time:', booking.visit2Time);

const v1Date = new Date(booking.visit1Date);
const v1Time = new Date(booking.visit1Time);
const v2Date = new Date(booking.visit2Date);
const v2Time = new Date(booking.visit2Time);


  return (
    <div>
      <p><strong>Your Booking:</strong></p>
<p>Visit 1: {v1Date.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})} at {v1Time.toLocaleTimeString('en-US', {
  hour: 'numeric', minute: '2-digit', hour12: true
})}</p>

<p>Visit 2: {v2Date.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})} at {v2Time.toLocaleTimeString('en-US', {
  hour: 'numeric', minute: '2-digit', hour12: true
})}</p>

      <button className="bg-red-500 text-white px-4 py-1 mt-2" onClick={cancelBooking}>Cancel Booking</button>
    </div>
  );
};

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Study Booking App</h1>

      {!isVerified && (
        <div className="space-y-2">
          <input type="text" placeholder="Your name" className="border p-2 w-full" value={name} onChange={e => setName(e.target.value)} />
          <input type="email" placeholder="Your email" className="border p-2 w-full" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="bg-blue-600 text-white px-4 py-2" disabled={timer > 0} onClick={sendOtp}>
            {timer > 0 ? `Wait ${timer}s` : 'Send OTP'}
          </button>
          {otpSent && (
            <>
              <input type="text" placeholder="Enter OTP" className="border p-2 w-full" value={otp} onChange={e => setOtp(e.target.value)} />
              <button className="bg-green-600 text-white px-4 py-2 mt-2" onClick={verifyOtp}>Verify</button>
            </>
          )}
        </div>
      )}

      {isVerified && (
        <div className="mt-4 space-y-4">
          {renderBookingDetails() || (
            <div className="space-y-2">
              <select className="border p-2 w-full" value={selectedVisit1} onChange={e => setSelectedVisit1(e.target.value)}>
                <option value="">Select Visit 1 Slot</option>
                {slots.visit1.map((slot, idx) => (
                  <option key={idx} value={`${slot[3]}|${slot[4]}`}>{`${slot[1]} – ${slot[2]}`}</option>
                ))}
              </select>
              <select className="border p-2 w-full" value={selectedVisit2} onChange={e => setSelectedVisit2(e.target.value)}>
                <option value="">Select Visit 2 Slot</option>
                {slots.visit2.map((slot, idx) => (
                  <option key={idx} value={`${slot[3]}|${slot[4]}`}>{`${slot[1]} – ${slot[2]}`}</option>
                ))}
              </select>
              <button className="bg-blue-700 text-white px-4 py-2" onClick={handleBooking}>Submit Booking</button>
            </div>
          )}

          {message && <p className="mt-2 text-green-600">{message}</p>}
        </div>
      )}

      {loading && <p className="mt-4">Loading...</p>}
    </div>
  );
}
