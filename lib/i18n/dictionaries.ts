export type Language = "en" | "hi" | "hinglish";

export type DictionaryKey = keyof typeof en;

/**
 * Central string table (Section 33). Patient-facing pages should always
 * pull copy from here — never hardcode user-facing strings in components.
 * Phase 7 (i18n completeness) extends this file; this is the starter set.
 */
export const en = {
  // Global / nav
  nav_home: "Home",
  nav_about: "About",
  nav_doctors: "Doctors",
  nav_departments: "Departments",
  nav_services: "Services",
  nav_contact: "Contact",
  nav_faq: "FAQ",
  nav_reviews: "Reviews",

  // CTAs
  cta_book_appointment: "Book Appointment",
  cta_call_now: "Call Now",
  cta_whatsapp: "WhatsApp",
  cta_get_directions: "Get Directions",
  cta_check_status: "Check Status",
  cta_submit: "Submit",
  cta_approve: "Approve",
  cta_reject: "Reject",
  cta_reschedule: "Reschedule",
  cta_mark_arrived: "Mark Arrived",
  cta_start_consultation: "Start Consultation",
  cta_mark_completed: "Mark Completed",
  cta_add_walk_in: "Add Walk-in",

  // Booking form
  form_department: "Department",
  form_doctor: "Doctor (optional)",
  form_doctor_any: "Any available",
  form_appointment_type: "Appointment Type",
  form_preferred_date: "Preferred Date",
  form_preferred_slot: "Preferred Time",
  form_name: "Patient Name",
  form_phone: "Phone Number",
  form_age: "Age",
  form_gender: "Gender",
  form_city_area: "City / Area",
  form_problem: "Problem / Symptoms",
  form_consent: "I agree to be contacted regarding this request.",

  // Confirmation
  booking_success_title: "Aapki request mil gayi hai / We've received your request.",
  booking_success_body: "Hum jald hi confirm karenge. / We'll confirm shortly.",

  // Status page
  status_lookup_title: "Check Your Appointment Status",
  status_lookup_phone_placeholder: "Enter the phone number used to book",
  status_not_found: "Koi appointment nahi mila is number par. / No appointment found for this number.",
  status_arrival_instruction: "Kripya apne appointment se 15 minute pehle aayein. / Please arrive 15 minutes before your appointment.",
  status_request_reschedule: "Request Reschedule",
  status_request_cancel: "Request Cancel",

  // Appointment statuses
  status_pending: "Pending",
  status_approved: "Approved",
  status_rescheduled: "Rescheduled",
  status_rejected: "Rejected",
  status_arrived: "Arrived",
  status_in_consultation: "In Consultation",
  status_completed: "Completed",
  status_no_show: "No Show",
  status_cancelled: "Cancelled",
  status_follow_up_required: "Follow-up Required",

  // Reception
  reception_new_requests: "New Requests",
  reception_today: "Today",
  reception_queue: "OPD Queue",
  reception_search_placeholder: "Search by name or phone",
  reception_reject_reason: "Reason for rejection",

  // Doctor dashboard
  doctor_today: "Today",
  doctor_tomorrow: "Tomorrow",
  doctor_pending: "Pending",
  doctor_arrived: "Arrived",
  doctor_completed: "Completed",
  doctor_add_note: "Add note",
  doctor_request_follow_up: "Request Follow-up",
} as const;

export const hi: Record<DictionaryKey, string> = {
  nav_home: "होम",
  nav_about: "हमारे बारे में",
  nav_doctors: "डॉक्टर्स",
  nav_departments: "विभाग",
  nav_services: "सेवाएं",
  nav_contact: "संपर्क करें",
  nav_faq: "सामान्य प्रश्न",
  nav_reviews: "रिव्यू",

  cta_book_appointment: "अपॉइंटमेंट बुक करें",
  cta_call_now: "कॉल करें",
  cta_whatsapp: "व्हाट्सएप",
  cta_get_directions: "दिशा देखें",
  cta_check_status: "स्टेटस देखें",
  cta_submit: "सबमिट करें",
  cta_approve: "स्वीकार करें",
  cta_reject: "रिजेक्ट करें",
  cta_reschedule: "समय बदलें",
  cta_mark_arrived: "आ गया मार्क करें",
  cta_start_consultation: "कंसल्टेशन शुरू करें",
  cta_mark_completed: "पूरा हुआ मार्क करें",
  cta_add_walk_in: "वॉक-इन जोड़ें",

  form_department: "विभाग",
  form_doctor: "डॉक्टर (वैकल्पिक)",
  form_doctor_any: "कोई भी उपलब्ध",
  form_appointment_type: "अपॉइंटमेंट प्रकार",
  form_preferred_date: "पसंदीदा तारीख",
  form_preferred_slot: "पसंदीदा समय",
  form_name: "मरीज़ का नाम",
  form_phone: "फ़ोन नंबर",
  form_age: "उम्र",
  form_gender: "लिंग",
  form_city_area: "शहर / इलाका",
  form_problem: "समस्या / लक्षण",
  form_consent: "मैं इस संबंध में संपर्क किए जाने के लिए सहमत हूं।",

  booking_success_title: "आपकी रिक्वेस्ट मिल गई है।",
  booking_success_body: "हम जल्द ही कन्फर्म करेंगे।",

  status_lookup_title: "अपनी अपॉइंटमेंट स्थिति देखें",
  status_lookup_phone_placeholder: "बुकिंग में दिया गया फ़ोन नंबर डालें",
  status_not_found: "इस नंबर पर कोई अपॉइंटमेंट नहीं मिला।",
  status_arrival_instruction: "कृपया अपने अपॉइंटमेंट से 15 मिनट पहले आएं।",
  status_request_reschedule: "समय बदलने का अनुरोध करें",
  status_request_cancel: "रद्द करने का अनुरोध करें",

  status_pending: "लंबित",
  status_approved: "स्वीकृत",
  status_rescheduled: "पुनर्निर्धारित",
  status_rejected: "रिजेक्ट किया गया",
  status_arrived: "पहुँच गए",
  status_in_consultation: "कंसल्टेशन जारी",
  status_completed: "पूर्ण",
  status_no_show: "नहीं आए",
  status_cancelled: "रद्द",
  status_follow_up_required: "फॉलो-अप ज़रूरी",

  reception_new_requests: "नई रिक्वेस्ट",
  reception_today: "आज",
  reception_queue: "ओपीडी कतार",
  reception_search_placeholder: "नाम या फ़ोन से खोजें",
  reception_reject_reason: "रिजेक्ट करने का कारण",

  doctor_today: "आज",
  doctor_tomorrow: "कल",
  doctor_pending: "लंबित",
  doctor_arrived: "पहुँच गए",
  doctor_completed: "पूर्ण",
  doctor_add_note: "नोट जोड़ें",
  doctor_request_follow_up: "फॉलो-अप का अनुरोध करें",
};

export const hinglish: Record<DictionaryKey, string> = {
  nav_home: "Home",
  nav_about: "Hamare Baare Mein",
  nav_doctors: "Doctors",
  nav_departments: "Departments",
  nav_services: "Services",
  nav_contact: "Contact Karein",
  nav_faq: "FAQ",
  nav_reviews: "Reviews",

  cta_book_appointment: "Appointment Book Karein",
  cta_call_now: "Call Karein",
  cta_whatsapp: "WhatsApp Karein",
  cta_get_directions: "Directions Dekhein",
  cta_check_status: "Status Check Karein",
  cta_submit: "Submit Karein",
  cta_approve: "Approve Karein",
  cta_reject: "Reject Karein",
  cta_reschedule: "Reschedule Karein",
  cta_mark_arrived: "Aa Gaya / Arrived",
  cta_start_consultation: "Consultation Shuru Karein",
  cta_mark_completed: "Ho Gaya / Completed",
  cta_add_walk_in: "Walk-in Add Karein",

  form_department: "Department",
  form_doctor: "Doctor (optional)",
  form_doctor_any: "Koi bhi available",
  form_appointment_type: "Appointment Type",
  form_preferred_date: "Pasandida Tareekh",
  form_preferred_slot: "Pasandida Samay",
  form_name: "Mareez ka Naam",
  form_phone: "Phone Number",
  form_age: "Umar",
  form_gender: "Gender",
  form_city_area: "Sheher / Area",
  form_problem: "Samasya / Lakshan",
  form_consent: "Main is sambandh me contact kiye jaane ke liye sahmat hoon.",

  booking_success_title: "Aapki request mil gayi hai.",
  booking_success_body: "Hum jald hi confirm karenge.",

  status_lookup_title: "Apni Appointment ka Status Dekhein",
  status_lookup_phone_placeholder: "Booking me diya gaya phone number daalein",
  status_not_found: "Is number par koi appointment nahi mila.",
  status_arrival_instruction: "Kripya apne appointment se 15 minute pehle aayein.",
  status_request_reschedule: "Reschedule ka Request Karein",
  status_request_cancel: "Cancel ka Request Karein",

  status_pending: "Pending",
  status_approved: "Approved",
  status_rescheduled: "Rescheduled",
  status_rejected: "Rejected",
  status_arrived: "Aa Gaya",
  status_in_consultation: "Consultation Jaari",
  status_completed: "Ho Gaya",
  status_no_show: "Nahi Aaye",
  status_cancelled: "Cancelled",
  status_follow_up_required: "Follow-up Zaroori",

  reception_new_requests: "Naye Requests",
  reception_today: "Aaj",
  reception_queue: "OPD Queue",
  reception_search_placeholder: "Naam ya phone se search karein",
  reception_reject_reason: "Reject karne ka reason",

  doctor_today: "Aaj",
  doctor_tomorrow: "Kal",
  doctor_pending: "Pending",
  doctor_arrived: "Aa Gaya",
  doctor_completed: "Ho Gaya",
  doctor_add_note: "Note Jodein",
  doctor_request_follow_up: "Follow-up Request Karein",
};

export const dictionaries: Record<Language, Record<DictionaryKey, string>> = {
  en,
  hi,
  hinglish,
};
