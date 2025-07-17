// BookingApp.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_URL/exec';

export default function BookingApp() {
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

  // Countdown timer
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    setOtpSent(false);
    setTimer(0);
  }, [email]);

  const sendOtp = () => {
    if (!email || !name) return setMessage('Name and Email required.');
    setOtpSent(true);
    setTimer(180);
    setMessage(`A verification code has been sent to ${email}. If not received, check spam folder. (Use 123456 for testing)`);
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
    } catch {
      setMessage('Failed to fetch slots');
    }
    setLoading(false);
  };

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}?type=getBooking&email=${encodeURIComponent(email)}`);
      if (res.data?.visit1Date) setBooking(res.data);
    } catch {
      setMessage('Could not fetch booking');
    }
    setLoading(false);
  };

  const handleBooking = async () => {
    if (!selectedVisit1 || !selectedVisit2) return setMessage('Select both slots');
    setLoading(true);
    const visit1 = selectedVisit1;
    const visit2 = selectedVisit2;

    try {
      const res = await axios.get(`${API_BASE}?type=submitBooking&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&visit1=${encodeURIComponent(visit1)}&visit2=${encodeURIComponent(visit2)}`);
      if (res.data.success) {
        setMessage('Booking successful!');
        fetchBooking();
        fetchSlots();
      } else {
        setMessage(res.data.message || 'Booking failed.');
      }
    } catch {
      setMessage('Error submitting booking');
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
        setMessage('Cancellation failed.');
      }
    } catch {
      setMessage('Error cancelling booking');
    }
    setLoading(false);
  };

  const filteredSlots = () => {
    const v1Date = selectedVisit1 ? selectedVisit1.split('|')[0] : null;
    const v2Date = selectedVisit2 ? selectedVisit2.split('|')[0] : null;

    let v1Filtered = slots.visit1;
    let v2Filtered = slots.visit2;

    if (v2Date) {
      const filterDate = new Date(v2Date);
      filterDate.setDate(filterDate.getDate() - 1);
      const match = filterDate.toISOString().split('T')[0];
      v1Filtered = v1Filtered.filter(slot => slot[3] === match);
    }

    if (v1Date) {
      const filterDate = new Date(v1Date);
      filterDate.setDate(filterDate.getDate() + 1);
      const match = filterDate.toISOString().split('T')[0];
      v2Filtered = v2Filtered.filter(slot => slot[3] === match);
    }

    return { v1Filtered, v2Filtered };
  };

  const formatLabel = (slot) => `${slot[1]} – ${slot[2]}`;

  const formatBooking = (dateStr, timeStr) => {
    try {
      const date = new Date(dateStr);
      return `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${timeStr}`;
    } catch {
      return `${dateStr} at ${timeStr}`;
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Study Booking</h2>

      {!isVerified && (
        <div className="space-y-3">
          <input className="border p-2 w-full" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          <input className="border p-2 w-full" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} />
          <button disabled={timer > 0} className="bg-blue-600 text-white px-4 py-2" onClick={sendOtp}>{timer > 0 ? `Wait ${timer}s` : 'Send OTP'}</button>
          {otpSent && (
            <>
              <input className="border p-2 w-full" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
              <button className="bg-green-600 text-white px-4 py-2" onClick={verifyOtp}>Verify</button>
            </>
          )}
        </div>
      )}

      {isVerified && (
        <div className="space-y-4 mt-4">
          {booking ? (
            <div>
              <p className="font-semibold">Your Booking:</p>
              <p>Visit 1: {formatBooking(booking.visit1Date, booking.visit1Time)}</p>
              <p>Visit 2: {formatBooking(booking.visit2Date, booking.visit2Time)}</p>
              <button className="bg-red-600 text-white px-4 py-2 mt-2" onClick={cancelBooking}>Cancel Booking</button>
            </div>
          ) : (
            <div className="space-y-2">
              <select className="border p-2 w-full" value={selectedVisit1} onChange={e => setSelectedVisit1(e.target.value)}>
                <option value="">Select Visit 1</option>
                {filteredSlots().v1Filtered.map((slot, idx) => (
                  <option key={idx} value={`${slot[3]}|${slot[4]}`}>{formatLabel(slot)}</option>
                ))}
              </select>
              <select className="border p-2 w-full" value={selectedVisit2} onChange={e => setSelectedVisit2(e.target.value)}>
                <option value="">Select Visit 2</option>
                {filteredSlots().v2Filtered.map((slot, idx) => (
                  <option key={idx} value={`${slot[3]}|${slot[4]}`}>{formatLabel(slot)}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button className="bg-blue-700 text-white px-4 py-2" onClick={handleBooking}>Submit</button>
                <button className="bg-gray-500 text-white px-4 py-2" onClick={() => { setSelectedVisit1(''); setSelectedVisit2(''); fetchSlots(); }}>Reset</button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <p className="text-center text-gray-600 mt-4">Loading...</p>}
      {message && <p className="text-green-700 mt-2 text-sm">{message}</p>}
    </div>
  );
}
