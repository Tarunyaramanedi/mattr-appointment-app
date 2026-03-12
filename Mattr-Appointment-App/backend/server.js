import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dataPath = path.join(process.cwd(), 'data');
const slotsFile = path.join(dataPath, 'slots.json');
const bookingsFile = path.join(dataPath, 'bookings.json');

// Ensure data folder and files exist
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath);
}

const initializeData = () => {
  if (!fs.existsSync(slotsFile)) {
    const initialSlots = [
      { id: 1, date: '2026-03-15', time: '10:00 AM', status: 'available' },
      { id: 2, date: '2026-03-15', time: '11:00 AM', status: 'available' },
      { id: 3, date: '2026-03-16', time: '02:00 PM', status: 'available' },
      { id: 4, date: '2026-03-16', time: '03:00 PM', status: 'available' },
      { id: 5, date: '2026-03-17', time: '09:00 AM', status: 'available' },
      { id: 6, date: '2026-03-17', time: '04:00 PM', status: 'available' },
    ];
    fs.writeFileSync(slotsFile, JSON.stringify(initialSlots, null, 2));
  }
  if (!fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, JSON.stringify([], null, 2));
  }
};

initializeData();

// Helper functions to read/write JSON securely
const readJSON = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const writeJSON = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// API to get slots
app.get('/api/slots', (req, res) => {
  const availableSlots = readJSON(slotsFile);
  res.json(availableSlots.filter((s) => s.status === 'available'));
});

// API to get all bookings (For the interviewer to see)
app.get('/api/bookings', (req, res) => {
  const bookings = readJSON(bookingsFile);
  res.json(bookings);
});

// API to book a slot
app.post('/api/book', (req, res) => {
  const { slotId, name, email } = req.body;
  
  if (!slotId || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const availableSlots = readJSON(slotsFile);
  const bookings = readJSON(bookingsFile);

  const slotIndex = availableSlots.findIndex((s) => s.id === slotId && s.status === 'available');
  if (slotIndex === -1) {
    return res.status(400).json({ error: 'Slot not available or invalid' });
  }

  // Update slot status
  availableSlots[slotIndex].status = 'booked';
  writeJSON(slotsFile, availableSlots);
  
  // Save booking
  const newBooking = {
    id: bookings.length + 1,
    slotId,
    name,
    email,
    date: availableSlots[slotIndex].date,
    time: availableSlots[slotIndex].time,
    bookedAt: new Date().toISOString()
  };
  
  bookings.push(newBooking);
  writeJSON(bookingsFile, bookings);

  res.status(201).json({ message: 'Booking successful', booking: newBooking });
});

// AI Assistant mock endpoint
app.post('/api/ai-assistant', (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const availableSlots = readJSON(slotsFile);

  // Simple keyword matching to simulate AI intent recognition
  // In Mattr, this could use OpenAI/Anthropic APIs
  const lowerQuery = query.toLowerCase();
  let responseMessage = "I'm not sure what you mean. Try asking for 'available slots' or to 'schedule a meeting on Monday'.";
  let suggestedSlots = [];

  if (lowerQuery.includes('available') || lowerQuery.includes('when')) {
    const availableCount = availableSlots.filter(s => s.status === 'available').length;
    responseMessage = `We currently have ${availableCount} slots available. Check the calendar!`;
    suggestedSlots = availableSlots.filter(s => s.status === 'available');
  } else if (lowerQuery.includes('morning')) {
    responseMessage = "Here are the morning slots I found:";
    suggestedSlots = availableSlots.filter(s => s.time.includes('AM') && s.status === 'available');
  } else if (lowerQuery.includes('afternoon')) {
    responseMessage = "Here are the afternoon slots I found:";
    suggestedSlots = availableSlots.filter(s => s.time.includes('PM') && s.status === 'available');
  }

  res.json({ message: responseMessage, suggestedSlots });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
