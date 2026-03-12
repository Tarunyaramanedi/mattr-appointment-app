import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, User, Mail, Sparkles, Send, CheckCircle2 } from 'lucide-react'

// Mock Initial Slots (In a real app, fetched from backend)
const INITIAL_SLOTS = [
  { id: 1, date: '2026-03-15', time: '10:00 AM', status: 'available' },
  { id: 2, date: '2026-03-15', time: '11:00 AM', status: 'available' },
  { id: 3, date: '2026-03-16', time: '02:00 PM', status: 'available' },
  { id: 4, date: '2026-03-16', time: '03:00 PM', status: 'available' },
  { id: 5, date: '2026-03-17', time: '09:00 AM', status: 'available' },
  { id: 6, date: '2026-03-17', time: '04:00 PM', status: 'available' },
]

function App() {
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingStatus, setBookingStatus] = useState(null)

  // Admin View State
  const [showBookings, setShowBookings] = useState(false)
  const [allBookings, setAllBookings] = useState([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)

  useEffect(() => {
    fetchSlots()
  }, [])

  const fetchSlots = async () => {
    try {
      const res = await fetch('https://mattr-appointment-app.onrender.com/api/slots')
      if (res.ok) {
        const data = await res.json()
        setSlots(data)
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
    }
  }

  const fetchBookings = async () => {
    setIsLoadingBookings(true)
    try {
      const res = await fetch('https://mattr-appointment-app.onrender.com/api/bookings')
      if (res.ok) {
        const data = await res.json()
        setAllBookings(data)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setIsLoadingBookings(false)
    }
  }

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // AI Chat State
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I'm your AI scheduling assistant. I can help you find the perfect time. Try asking 'What slots do you have tomorrow morning?'" }
  ])
  const [isAiThinking, setIsAiThinking] = useState(false)

  const handleBook = async (e) => {
    e.preventDefault()
    if (!selectedSlot || !name || !email) return

    setIsSubmitting(true)

    try {
      const res = await fetch('https://mattr-appointment-app.onrender.com/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          name,
          email
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSlots(slots.filter(s => s.id !== selectedSlot.id))
        setBookingStatus({ type: 'success', message: 'Appointment successfully booked! Data saved in backend.' })

        // Refresh bookings list if admin panel is open
        if (showBookings && fetchBookings) {
          fetchBookings()
        }

        setSelectedSlot(null)
        setName('')
        setEmail('')
        setMessages(prev => [...prev, { role: 'ai', text: `Great! I've booked your appointment for ${data.booking.date} at ${data.booking.time}.` }])
      } else {
        const errData = await res.json()
        setBookingStatus({ type: 'error', message: errData.error || 'Failed to book appointment.' })
      }
    } catch (error) {
      console.error('Booking failed:', error)
      setBookingStatus({ type: 'error', message: 'Network error. Could not reach server.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAiSubmit = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMessage = chatInput
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setChatInput('')
    setIsAiThinking(true)

    // Simulate AI response logic
    setTimeout(() => {
      let aiResponseText = "I couldn't quite understand that. You can try asking about 'morning slots', 'afternoon slots', or specific days."
      let suggestedSlots = []
      const lowerQuery = userMessage.toLowerCase()

      if (lowerQuery.includes('morning')) {
        suggestedSlots = slots.filter(s => s.time.includes('AM'))
        aiResponseText = suggestedSlots.length ? "I found these morning slots for you:" : "Sorry, we have no morning slots left."
      } else if (lowerQuery.includes('afternoon') || lowerQuery.includes('evening')) {
        suggestedSlots = slots.filter(s => s.time.includes('PM'))
        aiResponseText = suggestedSlots.length ? "I found these afternoon slots for you:" : "Sorry, we have no afternoon slots left."
      } else if (lowerQuery.includes('available') || lowerQuery.includes('when')) {
        suggestedSlots = slots
        aiResponseText = `We currently have ${slots.length} available slots across various days.`
      } else if (lowerQuery.includes('book') || lowerQuery.includes('schedule')) {
        aiResponseText = "Sure, please select a slot from the calendar on the left and fill in your details to book it."
      }

      const newMessage = { role: 'ai', text: aiResponseText, suggestions: suggestedSlots.map(s => s.id) }
      setMessages(prev => [...prev, newMessage])
      setIsAiThinking(false)

      // Auto select the first suggested slot
      if (suggestedSlots.length === 1) {
        setSelectedSlot(suggestedSlots[0])
      }
    }, 1000)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="app-container">
      {/* Left Panel: Booking Interface */}
      <div className="glass-panel main-content">
        <div className="header-section">
          <h1>Schedule a Meeting</h1>
          <p>Select an available time slot below to book your appointment.</p>
        </div>

        {bookingStatus && (
          <div className={`status-message ${bookingStatus.type}`}>
            {bookingStatus.type === 'success' && <CheckCircle2 size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />}
            {bookingStatus.message}
          </div>
        )}

        <div className="slots-grid">
          {slots.length === 0 ? (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>No slots available at the moment.</p>
          ) : (
            slots.map((slot) => (
              <div
                key={slot.id}
                className={`slot-card ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                onClick={() => setSelectedSlot(slot)}
              >
                <div className="slot-time">{slot.time}</div>
                <div className="slot-date">
                  <CalendarIcon size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  {formatDate(slot.date)}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedSlot && (
          <form className="booking-form" onSubmit={handleBook}>
            <div className="form-group">
              <label>Selected Slot</label>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', borderColor: 'var(--primary-color)' }}>
                <Clock size={16} color="var(--primary-color)" />
                <span>{formatDate(selectedSlot.date)} at {selectedSlot.time}</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  id="name"
                  required
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  id="email"
                  required
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn" disabled={isSubmitting}>
              {isSubmitting ? <div className="spinner"></div> : 'Confirm Booking'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <button
            className="btn"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', width: '100%', border: '1px solid var(--glass-border)' }}
            onClick={() => {
              const willShow = !showBookings;
              setShowBookings(willShow);
              if (willShow) fetchBookings();
            }}
          >
            {showBookings ? 'Hide Saved Bookings' : 'View Saved Bookings'}
          </button>

          {showBookings && (
            <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.3s' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Backend Database</span>
                {isLoadingBookings && <div className="spinner" style={{ width: '16px', height: '16px' }}></div>}
              </h3>

              {allBookings.length === 0 && !isLoadingBookings ? (
                <p style={{ color: 'var(--text-muted)' }}>No bookings found in database yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {allBookings.map(b => (
                    <div key={b.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontWeight: '600', color: 'var(--primary-color)', marginBottom: '4px' }}>{b.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{b.email}</div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CalendarIcon size={14} /> {formatDate(b.date)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {b.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: AI Assistant */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="ai-assistant">
          <div className="ai-header">
            <div className="ai-icon-container">
              <Sparkles size={20} color="white" />
            </div>
            <div>
              <h2>Mattr AI Assistant</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Online</span>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                {msg.text}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="suggestions">
                    {msg.suggestions.map(id => {
                      const s = slots.find(slot => slot.id === id);
                      if (!s) return null;
                      return (
                        <div
                          key={id}
                          className="suggestion-chip"
                          onClick={() => setSelectedSlot(s)}
                        >
                          {formatDate(s.date)} • {s.time}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            {isAiThinking && (
              <div className="message ai" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <div style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'fadeIn 0.5s infinite alternate' }}></div>
                <div style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'fadeIn 0.5s 0.2s infinite alternate' }}></div>
                <div style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'fadeIn 0.5s 0.4s infinite alternate' }}></div>
              </div>
            )}
          </div>

          <form onSubmit={handleAiSubmit} className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask for an available time..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="chat-submit" disabled={!chatInput.trim() || isAiThinking}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
