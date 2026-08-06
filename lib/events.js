// Seasonal event calendar — international days, Indian festivals, business/tech events.
// Entries are month/day recurring (MM-DD) so they work every year. Importance 1–5.
// Add/edit events via the Seasonal module UI (stored in Mongo, this is the seed).

export const SEED_EVENTS = [
  // January
  { d: '01-01', name: 'New Year — fresh content push', cat: 'Business', imp: 4, note: 'Annual planning + goal-setting content angle' },
  { d: '01-04', name: 'World Braille Day', cat: 'Awareness', imp: 2 },
  { d: '01-12', name: 'National Youth Day (India)', cat: 'India', imp: 3, note: 'Swami Vivekananda birth anniversary' },
  { d: '01-15', name: 'Indian Army Day', cat: 'India', imp: 2 },
  { d: '01-26', name: 'Republic Day (India)', cat: 'India', imp: 5, note: 'National holiday, Constitution theme' },
  { d: '01-27', name: 'International Holocaust Remembrance Day', cat: 'Awareness', imp: 2 },
  { d: '01-28', name: 'Data Privacy Day', cat: 'Tech', imp: 3, note: 'GDPR/privacy angles, strong AI tie-in' },
  // February
  { d: '02-04', name: 'World Cancer Day', cat: 'Awareness', imp: 3 },
  { d: '02-10', name: 'International Safer Internet Day', cat: 'Tech', imp: 3, note: 'First Tuesday of Feb — AI safety content angle' },
  { d: '02-14', name: "Valentine's Day — love in the workplace", cat: 'Global', imp: 3, note: 'Employee experience + retention angle' },
  { d: '02-21', name: 'International Mother Language Day', cat: 'Awareness', imp: 2 },
  // March
  { d: '03-03', name: 'Holi (approx.)', cat: 'India', imp: 4, note: 'Festival of colors — vibrant brand content' },
  { d: '03-08', name: 'International Women\u2019s Day', cat: 'Global', imp: 5, note: 'Women in leadership, HR inclusion content' },
  { d: '03-14', name: 'Pi Day — data & analytics', cat: 'Tech', imp: 3, note: 'Fun analytics/math content angle' },
  { d: '03-20', name: 'International Day of Happiness', cat: 'Awareness', imp: 3, note: 'Employee wellbeing angle' },
  { d: '03-21', name: 'World Down Syndrome Day', cat: 'Awareness', imp: 2 },
  // April
  { d: '04-07', name: 'World Health Day', cat: 'Awareness', imp: 3 },
  { d: '04-22', name: 'Earth Day', cat: 'Global', imp: 4, note: 'Sustainability + business strategy angle' },
  { d: '04-25', name: 'World Intellectual Property Day', cat: 'Awareness', imp: 2 },
  { d: '04-29', name: 'International Dance Day', cat: 'Awareness', imp: 1 },
  // May
  { d: '05-01', name: 'International Labour Day', cat: 'Global', imp: 4, note: 'Future of work, workforce trends' },
  { d: '05-08', name: "Mother's Day (approx.)", cat: 'Global', imp: 3, note: 'Second Sunday of May' },
  { d: '05-12', name: 'International Nurses Day', cat: 'Awareness', imp: 2 },
  { d: '05-17', name: 'World Telecommunication & Information Society Day', cat: 'Tech', imp: 2 },
  { d: '05-21', name: 'Anti-Terrorism Day (India)', cat: 'India', imp: 2 },
  { d: '05-29', name: 'International Day of UN Peacekeepers', cat: 'Awareness', imp: 2 },
  // June
  { d: '06-05', name: 'World Environment Day', cat: 'Global', imp: 4, note: 'Sustainability + corporate responsibility' },
  { d: '06-12', name: 'World Day Against Child Labour', cat: 'Awareness', imp: 2 },
  { d: '06-17', name: 'World Day to Combat Desertification', cat: 'Awareness', imp: 2 },
  { d: '06-21', name: 'International Yoga Day', cat: 'India', imp: 4, note: 'Wellbeing at work — huge India social moment' },
  { d: '06-21', name: "Father's Day (approx.)", cat: 'Global', imp: 3, note: 'Third Sunday of June' },
  // July
  { d: '07-11', name: 'World Population Day', cat: 'Awareness', imp: 2 },
  { d: '07-18', name: 'Nelson Mandela International Day', cat: 'Awareness', imp: 2, note: 'Leadership angle' },
  { d: '07-30', name: 'International Friendship Day', cat: 'Global', imp: 3, note: 'Community + networking content' },
  // August
  { d: '08-09', name: 'International Day of the World\u2019s Indigenous Peoples', cat: 'Awareness', imp: 2 },
  { d: '08-12', name: 'International Youth Day', cat: 'Global', imp: 3, note: 'Careers, upskilling, Gen Z workforce' },
  { d: '08-15', name: 'Independence Day (India)', cat: 'India', imp: 5, note: 'National holiday — patriotism + progress' },
  { d: '08-19', name: 'World Humanitarian Day', cat: 'Awareness', imp: 2 },
  { d: '08-23', name: 'International Day for Remembrance of the Slave Trade', cat: 'Awareness', imp: 2 },
  { d: '08-28', name: 'Raksha Bandhan (approx.)', cat: 'India', imp: 3, note: 'Sibling bond festival — retail-heavy day' },
  { d: '08-29', name: 'National Sports Day (India)', cat: 'India', imp: 2, note: 'Dhyan Chand birth anniversary' },
  // September
  { d: '09-05', name: "Teacher's Day (India)", cat: 'India', imp: 4, note: 'Learning, mentorship, L&D content' },
  { d: '09-08', name: 'International Literacy Day', cat: 'Awareness', imp: 2 },
  { d: '09-15', name: 'International Day of Democracy', cat: 'Awareness', imp: 2 },
  { d: '09-19', name: 'Ganesh Chaturthi (approx.)', cat: 'India', imp: 3, note: 'Vinayaka Chavithi — festive engagement' },
  { d: '09-21', name: 'International Day of Peace', cat: 'Awareness', imp: 2 },
  { d: '09-27', name: 'World Tourism Day', cat: 'Awareness', imp: 2 },
  { d: '09-29', name: 'World Heart Day', cat: 'Awareness', imp: 2 },
  // October
  { d: '10-01', name: 'International Coffee Day', cat: 'Global', imp: 3, note: 'Relatable "work culture" content' },
  { d: '10-02', name: 'Gandhi Jayanti (India)', cat: 'India', imp: 4, note: 'Leadership lessons from Gandhi' },
  { d: '10-05', name: "World Teachers' Day", cat: 'Awareness', imp: 3 },
  { d: '10-10', name: 'World Mental Health Day', cat: 'Global', imp: 5, note: 'Mental health at work — HR must-post' },
  { d: '10-14', name: 'World Standards Day', cat: 'Tech', imp: 2 },
  { d: '10-20', name: 'Dussehra / Vijayadashami (approx.)', cat: 'India', imp: 3, note: 'Victory of good — motivation angle' },
  { d: '10-24', name: 'United Nations Day', cat: 'Awareness', imp: 3, note: 'Global cooperation + SDGs' },
  { d: '10-31', name: 'Halloween — marketing fun', cat: 'Global', imp: 3, note: 'Creative brands push' },
  // November
  { d: '11-08', name: 'Diwali (2026 — approx.)', cat: 'India', imp: 5, note: 'Biggest Indian festival — premium campaign window' },
  { d: '11-14', name: "Children's Day (India)", cat: 'India', imp: 3, note: 'Nehru birth anniversary' },
  { d: '11-15', name: 'Guru Nanak Jayanti (approx.)', cat: 'India', imp: 3 },
  { d: '11-19', name: "World Men's Day", cat: 'Awareness', imp: 2 },
  { d: '11-25', name: 'International Day for the Elimination of Violence against Women', cat: 'Awareness', imp: 2 },
  { d: '11-27', name: 'Black Friday', cat: 'Business', imp: 4, note: 'Commerce + deal content' },
  // December
  { d: '12-01', name: 'World AIDS Day', cat: 'Awareness', imp: 2 },
  { d: '12-02', name: 'International Day for the Abolition of Slavery', cat: 'Awareness', imp: 2 },
  { d: '12-03', name: 'International Day of Persons with Disabilities', cat: 'Awareness', imp: 3, note: 'Inclusive hiring + accessibility content' },
  { d: '12-10', name: 'Human Rights Day', cat: 'Awareness', imp: 3 },
  { d: '12-25', name: 'Christmas', cat: 'Global', imp: 5, note: 'Year-end storytelling window' },
  { d: '12-31', name: "New Year's Eve — annual reflection", cat: 'Global', imp: 4, note: 'Year in review + 2027 predictions' },
]
