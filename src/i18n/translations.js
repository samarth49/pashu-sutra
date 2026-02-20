/**
 * Translations — English and Hindi
 * Add more languages by adding a new key (e.g., 'mr' for Marathi).
 */

export const translations = {
  en: {
    // ─── Navigation ────────────────────────────────────────────────
    nav: {
      dashboard: 'Dashboard',
      analytics: 'Analytics',
      health: 'Health',
      milk: 'Milk Log',
      pregnancy: 'Pregnancy',
      reports: 'Reports',
      animals: 'Animals',
      settings: 'Settings',
    },

    // ─── Common ────────────────────────────────────────────────────
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      loading: 'Loading...',
      noData: 'No data available',
      error: 'An error occurred',
      ok: 'OK',
      confirm: 'Confirm',
      select: 'Select',
      offline: '📶 Offline — data will sync when connected',
      synced: '✅ Synced {count} offline records',
    },

    // ─── Dashboard ─────────────────────────────────────────────────
    dashboard: {
      title: '🐄 Dashboard',
      status: 'Status',
      battery: 'Battery',
      lastUpdate: 'Last Update',
      temperature: 'Temp',
      heartRate: 'Heart Rate',
      humidity: 'Humidity',
      safe: '✓ Safe',
      alert: '⚠ Alert',
      connecting: 'Connecting...',
      connected: 'Live Connected',
      disconnected: 'Disconnected',
      waitingData: 'Wait...',
      noAnimalSelected: 'No animal selected. Go to Animals tab.',
      watchingAnimal: 'Watching',
    },

    // ─── Analytics ─────────────────────────────────────────────────
    analytics: {
      title: '📊 Analytics',
      timeRange: 'Time Range',
      last24h: 'Last 24h',
      last7d: 'Last 7 Days',
      last30d: 'Last 30 Days',
      temperatureTrend: 'Temperature Trend',
      heartRateTrend: 'Heart Rate Trend',
      geofenceStatus: 'Geofence Status',
      batteryLevel: 'Battery Level',
      timeSafe: 'Time Safe',
      timeOutside: 'Time Outside',
    },

    // ─── Health ────────────────────────────────────────────────────
    health: {
      title: '💉 Health',
      addVaccination: 'Add Vaccination',
      animalId: 'Animal ID',
      rfidTag: 'RFID Tag',
      vaccineName: 'Vaccine Name',
      date: 'Date',
      notes: 'Notes',
      status: 'Status',
      scheduled: 'Scheduled',
      completed: 'Completed',
      noRecords: 'No vaccination records found.',
      addRecord: '+ Add Record',
      reminderSent: 'Reminder Sent',
      upcomingSoon: 'Due Soon',
    },

    // ─── Reports ───────────────────────────────────────────────────
    reports: {
      title: '📄 Reports',
      generateReport: 'Generate Report',
      animalDetails: 'Animal Details',
      animalName: 'Animal Name',
      animalId: 'Animal ID',
      rfidTag: 'RFID Tag',
      ownerName: 'Owner Name',
      generatePdf: 'Generate & Share PDF',
      hint: '* Generates a PDF with vaccination history, health stats, and activity logs.',
      generating: 'Generating...',
      errorMissingInfo: 'Please enter an Animal ID or RFID Tag.',
      errorGenerate: 'Failed to generate report. Please try again.',
    },

    // ─── Animals ───────────────────────────────────────────────────
    animals: {
      title: '🐄 My Animals',
      addAnimal: 'Add Animal',
      noAnimals: 'No animals registered yet.',
      addFirst: 'Add your first animal to get started.',
      name: 'Animal Name',
      id: 'Animal ID',
      rfid: 'RFID Tag',
      owner: 'Owner Name',
      species: 'Species',
      cow: 'Cow',
      goat: 'Goat',
      buffalo: 'Buffalo',
      sheep: 'Sheep',
      selected: 'Monitoring',
      tapToSelect: 'Tap to Monitor',
      deleteConfirm: 'Are you sure you want to remove this animal?',
    },

    // ─── Settings ──────────────────────────────────────────────────
    settings: {
      title: '⚙️ Settings',
      language: 'Language',
      english: 'English',
      hindi: 'हिंदी (Hindi)',
      alertPhone: 'Alert Phone Number',
      geofenceRadius: 'Geofence Radius (meters)',
      thresholds: 'Alert Thresholds',
      tempHigh: 'High Temp Threshold (°C)',
      bpmHigh: 'High BPM Threshold',
      batteryLow: 'Low Battery Threshold (%)',
      saved: 'Settings saved!',
    },

    // ─── Alerts ────────────────────────────────────────────────────
    alerts: {
      connected: '✅ Connected',
      connectedMsg: 'Successfully connected to Adafruit IO server',
      geofence: '🚨 Geofence Alert',
      geofenceMsg: 'Animal is outside the geofence!',
      highTemp: '🌡️ High Temperature Alert',
      highBpm: '❤️ High Heart Rate Alert',
      lowBattery: '🔋 Low Battery Alert',
    },

    // ─── Milk Log (English) ───────────────────────────────────────────
    milk: {
      logMilk: 'Log Milk',
      today: 'Today',
      weeklyAvg: 'Weekly Avg',
      weekTotal: 'Week Total',
      trend14: '14-Day Trend',
      history: 'History',
      noLogs: 'No milk logs yet',
      morning: 'Morning',
      evening: 'Evening',
      date: 'Date',
      litres: 'Litres',
      notesHint: 'Any notes...',
      enterLitres: 'Please enter litres',
      deleteConfirm: 'Delete this milk log entry?',
    },

    // ─── Pregnancy (English) ──────────────────────────────────────────
    pregnancy: {
      addRecord: 'Add Pregnancy Record',
      active: 'Active Pregnancies',
      history: 'Past Records',
      noRecords: 'No pregnancy records',
      tapToAdd: 'Tap + to add a record',
      matingDate: 'Mating / Insemination Date',
      dueDate: 'Expected Due Date',
      deliveredOn: 'Delivered on',
      method: 'Method',
      methodNatural: 'Natural',
      methodAI: 'Artificial Insemination',
      pregnant: 'Pregnant',
      delivered: 'Delivered',
      aborted: 'Aborted',
      updateStatus: 'Update Status',
      enterDate: 'Please enter mating date',
    },
  },

  hi: {
    // ─── Navigation ────────────────────────────────────────────────
    nav: {
      dashboard: 'डैशबोर्ड',
      analytics: 'विश्लेषण',
      health: 'स्वास्थ्य',
      reports: 'रिपोर्ट',
      animals: 'पशु',
      milk: 'दूध लॉग',
      pregnancy: 'गर्भावस्था',
      settings: 'सेटिंग्स',
    },

    // ─── Common ────────────────────────────────────────────────────
    common: {
      save: 'सहेजें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      add: 'जोड़ें',
      loading: 'लोड हो रहा है...',
      noData: 'डेटा उपलब्ध नहीं',
      error: 'एक त्रुटि हुई',
      ok: 'ठीक है',
      confirm: 'पुष्टि करें',
      select: 'चुनें',
      offline: '📶 ऑफलाइन — कनेक्ट होने पर डेटा सिंक होगा',
      synced: '✅ {count} ऑफलाइन रिकॉर्ड सिंक हुए',
    },

    // ─── Dashboard ─────────────────────────────────────────────────
    dashboard: {
      title: '🐄 डैशबोर्ड',
      status: 'स्थिति',
      battery: 'बैटरी',
      lastUpdate: 'अंतिम अपडेट',
      temperature: 'तापमान',
      heartRate: 'हृदय गति',
      humidity: 'नमी',
      safe: '✓ सुरक्षित',
      alert: '⚠ सतर्क',
      connecting: 'जोड़ा जा रहा है...',
      connected: 'लाइव कनेक्टेड',
      disconnected: 'डिस्कनेक्ट',
      waitingData: 'प्रतीक्षा...',
      noAnimalSelected: 'कोई पशु नहीं चुना। पशु टैब पर जाएं।',
      watchingAnimal: 'देख रहे हैं',
    },

    // ─── Analytics ─────────────────────────────────────────────────
    analytics: {
      title: '📊 विश्लेषण',
      timeRange: 'समय सीमा',
      last24h: 'अंतिम 24 घंटे',
      last7d: 'अंतिम 7 दिन',
      last30d: 'अंतिम 30 दिन',
      temperatureTrend: 'तापमान रुझान',
      heartRateTrend: 'हृदय गति रुझान',
      geofenceStatus: 'जियोफेंस स्थिति',
      batteryLevel: 'बैटरी स्तर',
      timeSafe: 'सुरक्षित समय',
      timeOutside: 'बाहर का समय',
    },

    // ─── Health ────────────────────────────────────────────────────
    health: {
      title: '💉 स्वास्थ्य',
      addVaccination: 'टीकाकरण जोड़ें',
      animalId: 'पशु पहचान',
      rfidTag: 'RFID टैग',
      vaccineName: 'टीके का नाम',
      date: 'तारीख',
      notes: 'नोट्स',
      status: 'स्थिति',
      scheduled: 'निर्धारित',
      completed: 'पूर्ण',
      noRecords: 'कोई टीकाकरण रिकॉर्ड नहीं मिला।',
      addRecord: '+ रिकॉर्ड जोड़ें',
      reminderSent: 'अनुस्मारक भेजा',
      upcomingSoon: 'जल्द देय',
    },

    // ─── Reports ───────────────────────────────────────────────────
    reports: {
      title: '📄 रिपोर्ट',
      generateReport: 'रिपोर्ट बनाएं',
      animalDetails: 'पशु विवरण',
      animalName: 'पशु का नाम',
      animalId: 'पशु पहचान',
      rfidTag: 'RFID टैग',
      ownerName: 'मालिक का नाम',
      generatePdf: 'PDF बनाएं और साझा करें',
      hint: '* टीकाकरण इतिहास, स्वास्थ्य आंकड़े और गतिविधि लॉग के साथ PDF बनाता है।',
      generating: 'बन रहा है...',
      errorMissingInfo: 'कृपया पशु पहचान या RFID टैग दर्ज करें।',
      errorGenerate: 'रिपोर्ट बनाने में विफल। पुनः प्रयास करें।',
    },

    // ─── Animals ───────────────────────────────────────────────────
    animals: {
      title: '🐄 मेरे पशु',
      addAnimal: 'पशु जोड़ें',
      noAnimals: 'अभी तक कोई पशु दर्ज नहीं।',
      addFirst: 'शुरू करने के लिए अपना पहला पशु जोड़ें।',
      name: 'पशु का नाम',
      id: 'पशु पहचान',
      rfid: 'RFID टैग',
      owner: 'मालिक का नाम',
      species: 'प्रजाति',
      cow: 'गाय',
      goat: 'बकरी',
      buffalo: 'भैंस',
      sheep: 'भेड़',
      selected: 'निगरानी में',
      tapToSelect: 'निगरानी के लिए टैप करें',
      deleteConfirm: 'क्या आप इस पशु को हटाना चाहते हैं?',
    },

    // ─── Settings ──────────────────────────────────────────────────
    settings: {
      title: '⚙️ सेटिंग्स',
      language: 'भाषा',
      english: 'English',
      hindi: 'हिंदी (Hindi)',
      alertPhone: 'अलर्ट फ़ोन नंबर',
      geofenceRadius: 'जियोफेंस दायरा (मीटर)',
      thresholds: 'अलर्ट सीमाएं',
      tempHigh: 'उच्च तापमान सीमा (°C)',
      bpmHigh: 'उच्च हृदय गति सीमा',
      batteryLow: 'कम बैटरी सीमा (%)',
      saved: 'सेटिंग्स सहेजी गई!',
    },

    // ─── Alerts ────────────────────────────────────────────────────
    alerts: {
      connected: '✅ कनेक्ट हो गया',
      connectedMsg: 'Adafruit IO सर्वर से सफलतापूर्वक कनेक्ट हो गया',
      geofence: '🚨 जियोफेंस अलर्ट',
      geofenceMsg: 'पशु सीमा से बाहर है!',
      highTemp: '🌡️ उच्च तापमान अलर्ट',
      highBpm: '❤️ उच्च हृदय गति अलर्ट',
      lowBattery: '🔋 कम बैटरी अलर्ट',
    },

    // ─── Milk Log (Hindi) ───────────────────────────────────────────
    milk: {
      logMilk: 'दूध दर्ज करें',
      today: 'आज',
      weeklyAvg: 'साप्ताहिक औसत',
      weekTotal: 'सप्ताह कुल',
      trend14: '14 दिन का ट्रेंड',
      history: 'इतिहास',
      noLogs: 'कोई दूध रिकॉर्ड नहीं',
      morning: 'सुबह',
      evening: 'शाम',
      date: 'तारीख',
      litres: 'लीटर',
      notesHint: 'कोई टिप्पणी...',
      enterLitres: 'कृपया लीटर दर्ज करें',
      deleteConfirm: 'क्या इस रिकॉर्ड को हटाएं?',
    },

    // ─── Pregnancy (Hindi) ──────────────────────────────────────────
    pregnancy: {
      addRecord: 'गर्भावस्था दर्ज करें',
      active: 'सक्रिय गर्भावस्था',
      history: 'इतिहास',
      noRecords: 'कोई गर्भावस्था रिकॉर्ड नहीं',
      tapToAdd: 'शुरू करने के लिए + दबाएं',
      matingDate: 'संगम तारीख',
      dueDate: 'अपेक्षित प्रसव तारीख',
      deliveredOn: 'प्रसव हुआ',
      method: 'विधि',
      methodNatural: 'प्राकृतिक',
      methodAI: 'कृत्रिम गर्भाधान',
      pregnant: 'गर्भवती',
      delivered: 'प्रसव हुआ',
      aborted: 'गर्भपात',
      updateStatus: 'स्थिति बदलें',
      enterDate: 'कृपया संगम तारीख दर्ज करें',
    },
  },
};
