// SOLODEVELOPER AI BUSINESS AGENT - AUTOMATED DEMO BOOKING & NO-SHOW RECOVERY ENGINE
// Based on Alex Hormozi's Frictionless Scheduling & VIP High-Show Rate Playbook
// Manages slot generation, meeting link dispatch, pre-demo reminders, and no-show recovery.

/**
 * Generate smart next-available 10-minute demo slots based on IST time
 * @returns {Array<{ id: string, label: string, slotStr: string }>}
 */
function getSuggestedDemoSlots() {
  const now = new Date();
  // IST offset is UTC+5:30
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const currentHour = istNow.getUTCHours();

  const todayDateStr = istNow.toISOString().split('T')[0];
  const tomorrow = new Date(istNow.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

  if (currentHour < 15) {
    return [
      { id: "slot_1", label: "Today at 4:30 PM IST", slotStr: `${todayDateStr} 16:30` },
      { id: "slot_2", label: "Tomorrow at 11:00 AM IST", slotStr: `${tomorrowDateStr} 11:00` }
    ];
  } else {
    return [
      { id: "slot_1", label: "Tomorrow at 11:30 AM IST", slotStr: `${tomorrowDateStr} 11:30` },
      { id: "slot_2", label: "Tomorrow at 4:30 PM IST", slotStr: `${tomorrowDateStr} 16:30` }
    ];
  }
}

/**
 * Generate meeting format details and links
 * @param {string} meetingType
 * @param {string} phone
 * @returns {{ type: string, link: string, display: string }}
 */
function resolveMeetingDetails(meetingType = 'Google Meet', phone = '') {
  const typeLower = (meetingType || '').toLowerCase();
  if (typeLower.includes('whatsapp') || typeLower.includes('phone') || typeLower.includes('call')) {
    return {
      type: "WhatsApp Direct Strategy Call",
      link: `https://wa.me/${phone.replace(/[^0-9]/g, '')}`,
      display: `Direct WhatsApp Call (+${phone.replace(/[^0-9]/g, '')})`
    };
  }

  // Default to Google Meet room
  return {
    type: "Google Meet Live Screen Walkthrough",
    link: "https://meet.google.com/jdf-qrvw-tkm",
    display: "https://meet.google.com/jdf-qrvw-tkm"
  };
}

/**
 * Generate VIP Booking Confirmation Message for WhatsApp
 * @param {object} booking
 * @returns {string}
 */
function generateBookingConfirmation(booking = {}) {
  const name = booking.prospectName || booking.name || 'Friend';
  const company = booking.company || 'your business';
  const timeSlot = booking.demoTimeSlot || 'Tomorrow at 4:30 PM IST';
  const meeting = resolveMeetingDetails(booking.meetingType, booking.phone || '');

  return `🎉 *VIP Strategy Demo Confirmed!*

வணக்கம் ${name}! Your 10-minute live demonstration for *${company}* has been locked with Suresh Kumar.

📅 *Scheduled Time:* ${timeSlot}
🖥️ *Meeting Format:* ${meeting.type}
🔗 *Joining Link / Channel:* ${meeting.display}

💡 *What Suresh Will Walk You Through:*
1. Live breakdown of your industry's WhatsApp AI Agent
2. Exact calculation of recovered leads & missed revenue
3. 100% Zero-complexity setup demonstration

If you need to reschedule or have urgent questions before the call, simply reply to this message!`;
}

/**
 * Generate Pre-Demo Reminders (2 Hours & 10 Minutes Before)
 * @param {object} booking
 * @param {number} minutesBefore
 * @returns {string}
 */
function generatePreDemoReminder(booking = {}, minutesBefore = 120) {
  const name = booking.prospectName || booking.name || 'Friend';
  const company = booking.company || 'your business';
  const meeting = resolveMeetingDetails(booking.meetingType, booking.phone || '');

  if (minutesBefore <= 15) {
    return `⚡ *Starting in 10 Minutes!*

Hi ${name}, Suresh Kumar is ready for your 10-minute live strategy walkthrough for *${company}*.

🔗 *Tap to Join Now:* ${meeting.display}

See you inside in a few moments!`;
  }

  return `⏰ *Demo Reminder (In 2 Hours)*

Hi ${name}! Just a quick reminder about your live AI strategy walkthrough for *${company}* today at ${booking.demoTimeSlot || 'our scheduled time'}.

🖥️ *Joining Link:* ${meeting.display}

Looking forward to showing you how to automate your inquiry qualification!`;
}

/**
 * Generate Hormozi-style No-Show Recovery Hook
 * @param {object} booking
 * @returns {string}
 */
function generateNoShowFollowup(booking = {}) {
  const name = booking.prospectName || booking.name || 'Friend';
  const company = booking.company || 'your business';
  const slots = getSuggestedDemoSlots();

  return `Hi ${name}, Suresh here from SoloDeveloper!

I waited on the walkthrough link for our scheduled strategy demo for *${company}*. I completely understand that urgent business priorities pop up!

I’ve saved your custom demo environment. Which of these quick times would suit you better to reschedule?

1️⃣ ${slots[0].label}
2️⃣ ${slots[1].label}

Just reply with *1* or *2* and I'll update your calendar invite!`;
}

/**
 * Instructions for Gemini on how to propose demo slots and trigger bookStrategyDemo
 * @returns {string}
 */
function formatBookingEnginePrompt() {
  const slots = getSuggestedDemoSlots();

  return `
==================================================
AUTOMATED DEMO BOOKING SYSTEM PLAYBOOK
==================================================
Your primary goal with qualified prospects is to convert conversations into a 10-MINUTE LIVE DEMONSTRATION with Suresh.

1. WHEN TO PROPOSE A DEMO:
   • Prospect shows interest in an offer, blueprint, or lead magnet
   • Prospect replies positively to cold outreach ("Yes", "Sure", "Send details", "How does it work?")
   • Prospect has shared their core bottleneck and asks for pricing or implementation
   
2. HOW TO OFFER SLOTS (THE 2-SLOT TECHNIQUE):
   Never say "When are you free?" (Creates decision paralysis).
   Always propose TWO concrete choices:
   "I would love to walk you through a 10-minute live demo on your screen so you can see how it works for your business.
   Suresh has two quick slots open:
   1️⃣ ${slots[0].label}
   2️⃣ ${slots[1].label}
   Would either of these work for you, or do you prefer a direct WhatsApp call?"

3. WHEN PROSPECT SELECTS A TIME:
   IMMEDIATELY CALL the \`bookStrategyDemo\` tool!
   Pass:
   • prospectName
   • company
   • industry
   • demoTimeSlot (e.g. "${slots[0].label}" or whatever they chose)
   • meetingType ("Google Meet" or "WhatsApp Call")
   • topic: the core pain they discussed
   
   After the tool logs the booking, reply warmly with the confirmation details and calendar instructions. Keep it concise (under 4 lines).`;
}

module.exports = {
  getSuggestedDemoSlots,
  resolveMeetingDetails,
  generateBookingConfirmation,
  generatePreDemoReminder,
  generateNoShowFollowup,
  formatBookingEnginePrompt
};
