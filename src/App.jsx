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
  const [filteredVisit1, setFilteredVisit1] = useState([]);
  const [filteredVisit2, setFilteredVisit2] = useState([]);
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

  useEffect(() => {
    if (otpSent && email) {
      setMessage(`A verification code has been sent to ${email}. Please check your spam folder if you don't see it.`);
    }
  }, [otpSent, email]);

  useEffect(() => {
    const filterVisit2 = () => {
      if (!selectedVisit1) return slots.visit2;
      const [v1Date] = selectedVisit1.split('|');
      const visit1Plus1 = new Date(v1Date);
      visit1Plus1.setDate(visit1Plus1.getDate() + 1);
      return slots.visit2.filter(slot => {
        const v2 = new Date(slot[3]);
        return v2.toISOString().split('T')[0] === visit1Plus1.toISOString().split('T')[0];
      });
    };

    const filterVisit1 = () => {
      if (!selectedVisit2) return slots.visit1;
      const [v2Date] = selectedVisit2.split('|');
      const visit2Minus1 = new Date(v2Date);
      visit2Minus1.setDate(visit2Minus1.getDate() - 1);
      return slots.visit1.filter(slot => {
        const v1 = new Date(slot[3]);
        return v1.toISOString().split('T')[0] === visit2Minus1.toISOString().split('T')[0];
      });
    };

    setFilteredVisit1(filterVisit1());
    setFilteredVisit2(filterVisit2());
  }, [selectedVisit1, selectedVisit2, slots]);

  const sendOtp = async () => {
    if (!email || !name) {
      setMessage('Please enter both name and email.');
      return;
    }
    setOtpSent(true);
    setTimer(180);
    setMessage('(DEBUG) OTP is 123456 – This is for testing only.');
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
      setSlots(res.data);
    } catch (err) {
      setMessage('Failed to fetch slots.');
    }
    setLoading(false);
  };

  const fetchBooking = async () => {
    if (!email) return;
    try {
      const res = await axios.get(`${API_BASE}?type=getBooking&email=${encodeURIComponent(email)}`);
      if (res.data && res.data.visit1Date) {
        setBooking(res.data);
      } else {
        setBooking(null);
      }
    } catch (err) {
      console.error(err);
      setBooking(null);
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
      const [v1Date, v1Time] = selectedVisit1.split('|').map(s => s.trim());
      const [v2Date, v2Time] = selectedVisit2.split('|').map(s => s.trim());

      const visit1 = `${v1Date}|${v1Time}`;
      const visit2 = `${v2Date}|${v2Time}`;

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
      const res = await axios.get(`${API_BASE}?type=cancelBooking&email=${encodeURIComponent(email)}`);
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
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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
    return (
      <div>
        <p><strong>Your Booking:</strong></p>
        <p>Visit 1: {formatDate(booking.visit1Date)} at {formatTime(booking.visit1Time)}</p>
        <p>Visit 2: {formatDate(booking.visit2Date)} at {formatTime(booking.visit2Time)}</p>
        <button className="bg-red-500 text-white px-4 py-1 mt-2" onClick={cancelBooking}>Cancel Booking</button>
      </div>
    );
  };

  const resetForm = () => {
    setSelectedVisit1('');
    setSelectedVisit2('');
    fetchSlots();
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Study Booking App</h1>

      {!isVerified && (
        <div className="space-y-2">
          <input type="text" placeholder="Your name" className="border p-2 w-full" value={name} onChange={e => setName(e.target.value)} />
          <input type="email" placeholder="Your email" className="border p-2 w-full" value={email} onChange={e => {
            setEmail(e.target.value);
            setOtpSent(false);
            setTimer(0);
          }} />
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
                {filteredVisit1.map((slot, idx) => (
                  <option key={idx} value={`${slot[3]}|${slot[4]}`}>{`${slot[1]} – ${slot[2]}`}</option>
                ))}
              </select>
              <select className="border p-2 w-full" value={selectedVisit2} onChange={e => setSelectedVisit2(e.target.value)}>
                <option value="">Select Visit 2 Slot</option>
                {filteredVisit2.map((slot, idx) => (
                  <option key={idx} value={`${slot[3]}|${slot[4]}`}>{`${slot[1]} – ${slot[2]}`}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button className="bg-blue-700 text-white px-4 py-2" onClick={handleBooking} disabled={loading}>Submit Booking</button>
                <button className="bg-gray-500 text-white px-4 py-2" onClick={resetForm}>Reset</button>
              </div>
            </div>
          )}

          {message && <p className="mt-2 text-green-600">{message}</p>}
        </div>
      )}

      {loading && <p className="mt-4">Loading...</p>}
    </div>
  );
}