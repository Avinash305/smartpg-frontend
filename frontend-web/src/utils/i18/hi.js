const hi = {
  translation: {
    nav: {
      title: 'PG मैनेजर', notifications: 'सूचनाएँ', unread: '{{count}} अपठित', loading: 'लोड हो रहा है…', close: 'बंद करें', none: 'कोई सूचनाएँ नहीं', refresh: 'रिफ्रेश', more: 'और देखें', profile: 'आपकी प्रोफ़ाइल', settings: 'सेटिंग्स', sign_out: 'साइन आउट',
      user: 'उपयोगकर्ता',
      filter_by_buildings: 'बिल्डिंग द्वारा फ़िल्टर करें',
      all_buildings: 'सभी बिल्डिंग्स',
      n_selected: '{{count}} चुना गया',
      select_all: 'सभी चुनें',
      clear: 'क्लियर',
    },
    sidebar: { dashboard: 'डैशबोर्ड', buildings: 'बिल्डिंग्स', tenants: 'किरायेदार', income: 'आय', expenses: 'खर्चे', bookings: 'बुकिंग्स', payments: 'भुगतान', messages: 'संदेश', settings: 'सेटिंग्स', reports: 'रिपोर्ट्स', staffs: 'स्टाफ' },
    login: {
      login_as: 'लॉगिन करें', select_role: 'भूमिका चुनें', role_pg_admin: 'PG एडमिन', role_pg_staff: 'PG स्टाफ',
      email: 'ईमेल पता', email_placeholder: 'अपना ईमेल दर्ज करें', password: 'पासवर्ड', password_placeholder: 'अपना पासवर्ड दर्ज करें',
      remember_me: 'मुझे याद रखें', forgot_password: 'पासवर्ड भूल गए?', sign_in: 'साइन इन', signing_in: 'साइन इन हो रहा है...', no_account: 'खाता नहीं है?', sign_up: 'साइन अप', success: 'लॉगिन सफल! रीडायरेक्ट हो रहा है...', errors: { select_role: 'कृपया भूमिका चुनें', email_required: 'ईमेल आवश्यक है', email_invalid: 'ईमेल अमान्य है', password_required: 'पासवर्ड आवश्यक है', failed: 'लॉगिन असफल। कृपया जाँचें और पुनः प्रयास करें।' }
    },
    buildings: {
      name: 'नाम', city: 'शहर', state: 'राज्य', type: 'प्रकार', status: 'स्थिति', active: 'सक्रिय', inactive: 'निष्क्रिय', actions: 'कार्य', list: 'सूची', cards: 'कार्ड', no_buildings: 'कोई बिल्डिंग नहीं मिली', loading: 'बिल्डिंग्स लोड हो रही हैं...', permission_denied: 'आपको किसी भी बिल्डिंग को देखने की अनुमति नहीं है', load_failed: 'बिल्डिंग्स लोड करने में विफल', view_details: 'विवरण देखें', address: 'पता:', notes: 'नोट्स:', type_boys: 'लड़के', type_girls: 'लड़कियाँ', type_coliving: 'को-लिविंग',
      building_with_id: 'बिल्डिंग {{id}}',
      title: 'इमारतें',
      add_building: 'इमारत जोड़ें',
      edit_building_title: 'इमारत संपादित करें: {{name}}',
      address_label: 'पता',
      notes_label: 'नोट्स',
      overview: 'ओवरव्यू',
      back: 'वापस',
      view_on_maps: 'मानचित्र पर देखें',
      open_in_maps: 'गूगल मानचित्र में खोलें',
      floors_label: 'मंजिलें',
      rooms_label: 'कमरे',
      beds_label: 'बेड',
      code: 'कोड',
      pincode: 'पिन कोड',
      manager: 'प्रबंधक',
      created: 'निर्मित',
      updated: 'अद्यतन',
      not_found: 'इमारत नहीं मिली।',
      updated_success: 'इमारत अद्यतन',
      property_type: 'संपत्ति प्रकार',
      total_tenants: 'कुल किरायेदार',
      pg_capacity: 'पीजी क्षमता',
      room_occupancy: 'कमरा अधिभोग',
      bed_occupancy: 'बेड अधिभोग',
      tooltip_occupied: '{{pct}}% अधिभोग',
      tooltip_available: '{{pct}}% उपलब्ध',
      tooltip_maintenance: '{{pct}}% रखरखाव',
      available: 'उपलब्ध',
      occupied: 'अधिभोग',
      reserved: 'आरक्षित',
      maintenance_short: 'रखरखाव',
      action_edit: 'संपादित करें',
      action_inactive_soft_deleted: 'निष्क्रिय (सॉफ्ट डिलीट)',
      action_soft_delete: 'सॉफ्ट डिलीट',
      action_delete_permanently: 'स्थायी रूप से हटाएं',
      confirm_delete_title: 'इमारत हटाएं',
      confirm_soft_delete_title: 'इमारत को निष्क्रिय करें',
      confirm_delete_message: 'यह "{{name}}" को स्थायी रूप से हटा देगा। यह कार्रवाई वापस नहीं की जा सकती।',
      confirm_soft_delete_message: '"{{name}}" को निष्क्रिय करें? आप इसे बाद में सक्रिय करने के लिए सेट कर सकते हैं।',
      cancel: 'रद्द करें',
      soft_delete: 'सॉफ्ट डिलीट',
      delete_hold_shift: 'हटाएं (शिफ्ट दबाएं)',
      permission_edit_deny: 'आपको इस इमारत को संपादित करने की अनुमति नहीं है।',
      permission_delete_deny: 'आपको इस इमारत को हटाने की अनुमति नहीं है।',
      toasts_marked_inactive: 'इमारत निष्क्रिय कर दी गई',
      toasts_soft_delete_failed: 'सॉफ्ट डिलीट विफल',
      toasts_deleted_permanently: 'इमारत स्थायी रूप से हटा दी गई',
      toasts_delete_failed: 'हटाने में विफल',
      toasts_hold_shift_to_confirm: 'स्थायी रूप से हटाने की पुष्टि के लिए शिफ्ट दबाएं और हटाएं',
      stats_loading: 'सांख्यिकी लोड हो रही है…',
      stats_load_failed: 'सांख्यिकी लोड करने में विफल',
      placeholders: {
        name: 'इमारत का नाम दर्ज करें',
        address: 'पता दर्ज करें',
        city: 'शहर दर्ज करें',
        state: 'राज्य दर्ज करें',
        pincode: '6 अंक',
        code: 'वैकल्पिक',
        notes: 'कोई अतिरिक्त जानकारी...'
      },
      errors: {
        owner_required: 'मालिक आवश्यक है',
        name_required: 'नाम आवश्यक है',
        address_required: 'पता आवश्यक है',
        city_required: 'शहर आवश्यक है',
        state_required: 'राज्य आवश्यक है',
        pincode_invalid: 'पिन कोड 6 अंकों का होना चाहिए',
        please_fix_fields: 'कृपया हाइलाइट किए गए क्षेत्रों को ठीक करें'
      },
      permissions: {
        no_permission_edit_buildings: 'आपको इमारतों को संपादित करने की अनुमति नहीं है',
        no_permission_add_buildings: 'आपको इमारतें जोड़ने की अनुमति नहीं है',
        permission_denied_cannot_edit_building: 'अनुमति निषेध: इस इमारत को संपादित नहीं कर सकते।',
        permission_denied_cannot_add_buildings: 'अनुमति निषेध: इमारतें नहीं जोड़ सकते।'
      },
      update: 'अद्यतन',
      toasts: {
        building_updated: 'इमारत अद्यतन: {{name}}',
        building_created: 'इमारत बनाई गई: {{name}}'
      }
    },
    floors: {
      floor: 'मंजिल',
      floors: 'मंजिलें',
      building: 'इमारत',
      notes: 'नोट्स',
      actions: 'कार्य',
      list: 'सूची',
      cards: 'कार्ड',
      overview: 'ओवरव्यू',
      no_floors: 'कोई मंजिल नहीं मिली',
      no_floors_for_building: 'इस इमारत के लिए कोई मंजिल नहीं मिली',
      loading: 'मंजिलें लोड हो रही हैं...',
      permission_denied: 'आपको मंजिलें देखने की अनुमति नहीं है',
      permission_denied_for_building: 'आपको इस इमारत की मंजिलें देखने की अनुमति नहीं है',
      load_failed: 'मंजिलें लोड करने में विफल',
      view_details: 'विवरण देखें',
      rooms: 'कमरे',
      beds: 'बेड',
      capacity: 'क्षमता',
      room_occupancy: 'कमरा अधिभोग',
      bed_occupancy: 'बेड अधिभोग',
      tooltip_occupied: '{{pct}}% अधिभोग',
      tooltip_available: '{{pct}}% उपलब्ध',
      action_edit: 'संपादित करें',
      action_inactive_soft_deleted: 'निष्क्रिय (सॉफ्ट डिलीट)',
      action_soft_delete: 'सॉफ्ट डिलीट',
      action_delete_permanently: 'स्थायी रूप से हटाएं',
      confirm_delete_title: 'मंजिल हटाएं',
      confirm_soft_delete_title: 'मंजिल को निष्क्रिय करें',
      confirm_delete_message: 'यह "{{name}}" को स्थायी रूप से हटा देगा। यह कार्रवाई वापस नहीं की जा सकती।',
      confirm_soft_delete_message: '"{{name}}" को निष्क्रिय करें? आप इसे बाद में Active को true करके पुनर्स्थापित कर सकते हैं।',
      cancel: 'रद्द करें',
      soft_delete: 'सॉफ्ट डिलीट',
      delete_hold_shift: 'हटाएं (शिफ्ट दबाएं)',
      toasts_marked_inactive: 'मंजिल निष्क्रिय कर दी गई',
      toasts_soft_delete_failed: 'सॉफ्ट डिलीट विफल',
      toasts_deleted_permanently: 'मंजिल स्थायी रूप से हटा दी गई',
      toasts_delete_failed: 'हटाने में विफल',
      toasts_hold_shift_to_confirm: 'स्थायी रूप से हटाने की पुष्टि के लिए शिफ्ट दबाएं और हटाएं',
      floor_label_unknown: '-',
      floor_label_ground: 'भूतल',
      floor_label_suffix: 'मंजिल',
      titles: {
        title: 'मंजिलें',
        add_floor: 'मंजिल जोड़ें',
        edit_floor_title: 'मंजिल संपादित करें: {{name}}',
        edit_floor: 'मंजिल संपादित करें'
      },
      placeholders: {
        select_building: 'इमारत चुनें',
        select_floor: 'मंजिल चुनें'
      },
      errors: {
        building_required: 'इमारत आवश्यक है',
        number_required: 'संख्या आवश्यक है',
        number_numeric: 'संख्या संख्यात्मक होनी चाहिए',
        number_range: 'संख्या 0 और 14 के बीच होनी चाहिए',
        duplicate_for_building: 'चयनित इमारत के लिए यह मंजिल पहले से मौजूद है।'
      },
      permissions: {
        reason_edit: 'आपको इस इमारत के लिए मंजिल संपादित करने की अनुमति नहीं है।',
        reason_add: 'आपको मंजिल जोड़ने की अनुमति नहीं है।',
        deny_edit: 'अनुमति निषेध: इस इमारत के लिए मंजिल संपादित नहीं कर सकते।',
        deny_add: 'अनुमति निषेध: मंजिल जोड़ नहीं सकते।',
        deny_delete: 'अनुमति निषेध: इस इमारत के लिए मंजिल हटाने की अनुमति नहीं है।'
      },
      buttons: {
        save_changes: 'परिवर्तन सहेजें',
        create_floor: 'मंजिल बनाएँ'
      },
      toasts: {
        floor_updated: 'मंजिल अद्यतन: {{name}}',
        floor_created: 'मंजिल बनाई गई: {{name}}',
        created_success: 'मंजिल बनाई गई',
        updated_success: 'मंजिल अद्यतन'
      },
      save_failed: 'मंजिल सहेजने में विफल'
    },
    rooms: {
      room: 'कमरा',
      rooms: 'कमरे',
      floor: 'मंजिल',
      type: 'प्रकार',
      capacity: 'क्षमता',
      rent: 'किराया',
      deposit: 'जमा',
      available: 'उपलब्ध',
      occupied: 'व्याप्त',
      reserved: 'आरक्षित',
      maintenance: 'रखरखाव',
      yes: 'हाँ',
      no: 'नहीं',
      actions: 'कार्य',
      list: 'सूची',
      cards: 'कार्ड',
      view_details: 'विवरण देखें',
      no_rooms: 'कोई कमरे नहीं मिले',
      no_rooms_for_floor: 'इस मंजिल के लिए कोई कमरे नहीं मिले',
      loading: 'कमरे लोड हो रहे हैं...',
      permission_denied: 'आपको कमरे देखने की अनुमति नहीं है',
      load_failed: 'कमरे लोड करने में विफल',
      titles: {
        title: 'कमरे',
        add_room: 'कमरा जोड़ें',
        edit_room_title: 'कमरा संपादित करें: {{name}}',
        edit_room: 'कमरा संपादित करें'
      },
      labels: {
        number: 'कमरा संख्या',
        room_type: 'कमरे का प्रकार',
        monthly_rent: 'मासिक किराया',
        security_deposit: 'सिक्योरिटी डिपॉजिट',
        notes: 'नोट्स',
        active: 'सक्रिय',
        beds: 'बेड',
        bed_number: 'बिस्तर संख्या',
        auto_number: 'ऑटो-नंबर 1..N'
      },
      types: {
        single_sharing: 'सिंगल शेयरिंग',
        n_sharing: '{{n}} शेयरिंग'
      },
      errors: {
        floor_required: 'मंजिल आवश्यक है',
        number_required: 'कमरा संख्या आवश्यक है',
        room_type_required: 'कमरे का प्रकार आवश्यक है',
        monthly_rent_required: 'मासिक किराया आवश्यक है',
        security_deposit_required: 'सिक्योरिटी डिपॉजिट आवश्यक है',
        capacity_required: 'क्षमता आवश्यक है',
        bed_number_required: 'प्रत्येक बेड का एक नंबर होना चाहिए',
        bed_number_unique: 'बेड नंबर अद्वितीय होने चाहिए',
        number_duplicate: 'चयनित मंजिल पर यह कमरा नंबर पहले से मौजूद है।'
      },
      permissions: {
        reason_edit: 'आपको इस इमारत के लिए कमरे संपादित करने की अनुमति नहीं है।',
        reason_add: 'आपको कमरे जोड़ने की अनुमति नहीं है।',
        deny_edit: 'अनुमति निषेध: इस इमारत के लिए कमरे संपादित नहीं कर सकते।',
        deny_add: 'अनुमति निषेध: कमरे जोड़ नहीं सकते।',
        deny_delete: 'अनुमति निषेध: इस इमारत के लिए कमरे हटाने की अनुमति नहीं है।',
        reason_delete: 'आपको कमरे हटाने की अनुमति नहीं है।'
      },
      action_edit: 'संपादित करें',
      action_inactive_soft_deleted: 'निष्क्रिय (सॉफ्ट डिलीट)',
      action_soft_delete: 'सॉफ्ट डिलीट',
      action_delete_permanently: 'स्थायी रूप से हटाएं',
      confirm_delete_title: 'कमरा हटाएं',
      confirm_soft_delete_title: 'कमरे को निष्क्रिय करें',
      confirm_delete_message: 'यह "{{name}}" को स्थायी रूप से हटा देगा। यह कार्रवाई वापस नहीं की जा सकती।',
      confirm_soft_delete_message: '"{{name}}" को निष्क्रिय करें? आप इसे बाद में Active को true करके पुनर्स्थापित कर सकते हैं।',
      cancel: 'रद्द करें',
      soft_delete: 'सॉफ्ट डिलीट',
      delete_hold_shift: 'हटाएं (शिफ्ट दबाएं)',
      buttons: {
        save_changes: 'परिवर्तन सहेजें',
        create_room: 'कमरा बनाएँ'
      },
      toasts: {
        created_success: 'कमरा बनाया गया',
        updated_success: 'कमरा अद्यतन',
        marked_inactive: 'कमरा निष्क्रिय कर दिया गया',
        soft_delete_failed: 'सॉफ्ट डिलीट विफल',
        deleted_permanently: 'कमरा स्थायी रूप से हटा दिया गया',
        delete_failed: 'हटाने में विफल',
        hold_shift_to_confirm: 'स्थायी रूप से हटाने की पुष्टि के लिए शिफ्ट दबाएं और हटाएं'
      },
      save_failed: 'कमरा सहेजने में विफल'
    },
    beds: {
      title: 'बेड',
      bed: 'बिस्तर',
      beds: 'बेड',
      loading: 'बेड लोड हो रहे हैं...',
      no_beds: 'कोई बेड नहीं मिले',
      no_beds_for_room: 'इस कमरे के लिए कोई बेड नहीं मिले',
      view_details: 'विवरण देखें',
      bed_with_number: 'बेड {{n}}',
      number: 'बेड नंबर',
      auto_number: 'स्वचालित नंबर 1..N',
      available: 'उपलब्ध',
      occupied: 'अधिभोग',
      maintenance: 'रखरखाव',
      reserved: 'आरक्षित',
      status: 'स्थिति',
      rent: 'किराया',
      room: 'कमरा',
      building: 'इमारत',
      floor: 'मंजिल',
      tenant: 'किरायेदार',
      no_tenant: 'कोई किरायेदार नहीं',
      notes: 'नोट्स',
      confirm_delete: 'क्या आप वाकई इस बेड को हटाना चाहते हैं?',
      delete_success: 'बेड सफलतापूर्वक हटा दिया गया',
      delete_error: 'बेड हटाने में त्रुटि',
      save_success: 'बेड सफलतापूर्वक सहेजा गया',
      save_error: 'बेड सहेजने में त्रुटि',
      number_placeholder: 'जैसे, B1, 1, A-01',
      rent_placeholder: 'जैसे, 3500.00',
      notes_placeholder_maintenance: 'रखरखाव का कारण (आवश्यक)',
      notes_placeholder_optional: 'वैकल्पिक नोट्स',
      validation: {
        number_required: 'बेड नंबर आवश्यक है',
        number_unique: 'यह बेड नंबर पहले से मौजूद है',
        room_required: 'कमरा चुनना आवश्यक है'
      },
      statuses: {
        available: 'उपलब्ध',
        occupied: 'अधिभोग',
        maintenance: 'रखरखाव',
        reserved: 'आरक्षित'
      },
      actions: {
        add_bed: 'बेड जोड़ें',
        edit_bed: 'बेड संपादित करें',
        delete_bed: 'बेड हटाएं',
        create_bed: 'बेड बनाएं',
        check_out: 'चेक-आउट',
        confirm_checkout: 'चेक-आउट की पुष्टि करें'
      },
      dialogs: {
        delete_title: 'बेड हटाएं',
        checkout_title: 'किरायेदार चेक-आउट',
        delete_description: 'यह "{{label}}" को स्थायी रूप से हटा देगा। यह कार्रवाई वापस नहीं की जा सकती।',
        checkout_description: 'वर्तमान किरायेदार को "{{label}}" से चेक-आउट करें? आज की तारीख वास्तविक चेक-आउट के रूप में सेट की जाएगी।'
      },
      toasts: {
        created: 'बेड सफलतापूर्वक बनाया गया',
        updated: 'बेड सफलतापूर्वक अपडेट किया गया',
        updated_success: 'बेड सफलतापूर्वक अपडेट किया गया',
        checked_out_success: 'किरायेदार सफलतापूर्वक चेक-आउट हुआ',
        deleted_permanently: 'बेड स्थायी रूप से हटा दिया गया'
      },
      errors: {
        checkout_failed: 'चेक-आउट विफल',
        delete_failed: 'हटाना विफल',
        save_failed: 'बेड सहेजने में विफल',
        load_failed: 'बेड लोड करने में विफल'
      },
      columns: {
        number: 'बेड #',
        status: 'स्थिति',
        rent: 'किराया'
      },
      history: {
        title_for_label: '{{label}} के लिए बेड इतिहास',
        description: 'इस बेड के लिए हाल की रहाइश और बुकिंग',
        occupied_no_history_hint: 'बुकिंग के कारण बेड को अधिभोग के रूप में चिह्नित किया गया है, लेकिन अभी तक कोई रहाइश इतिहास नहीं है। बेड उपयोग इतिहास को ट्रैक करने के लिए एक रहाइश बनाएं।',
        no_history: 'कोई इतिहास नहीं मिला'
      }
    },
    settings: { language: { title: 'भाषा', subtitle: 'अपनी पसंदीदा ऐप भाषा चुनें।', label: 'भाषा', current: 'वर्तमान' }, localization: { cancel: 'रद्द करें' } },
    common: { 
      save: 'सेव', 
      saving: 'सेव हो रहा है…', 
      load_more: 'और लोड करें',
      retry: 'पुनः प्रयास करें',
      actions: 'कार्य',
      edit: 'संपादित करें',
      delete_permanently: 'स्थायी रूप से हटाएं',
      cancel: 'रद्द करें',
      confirm: 'पुष्टि करें',
      delete_hold_shift: 'हटाएं (Shift दबाएं)',
      hold_shift_to_confirm: 'स्थायी रूप से हटाने की पुष्टि के लिए Shift दबाएं और हटाएं क्लिक करें',
      date_ranges: {
        today: 'आज',
        yesterday: 'कल',
        last7: 'पिछले 7 दिन',
        last15: 'पिछले 15 दिन',
        last30: 'पिछले 30 दिन',
        this_month: 'यह माह',
        last_month: 'पिछला माह',
        this_year: 'यह वर्ष',
        last_year: 'पिछला वर्ष',
        range: 'रेंज'
      }
    },
    toasts: { must_login: 'भाषा अपडेट करने के लिए लॉगिन करें।', language_saved: 'भाषा वरीयता सेव की गई।', save_failed: 'भाषा सेव करने में विफल।' },
    dashboard: {
      bed_availability: {
        title: 'खाली बेड',
        view_all: 'सभी देखें',
        search_placeholder: 'बेड, कमरा, बिल्डिंग खोजें...',
        available_beds: 'उपलब्ध बेड',
        loading: 'लोड हो रहा है…',
        empty: 'चयन के लिए कोई उपलब्ध बेड नहीं मिले।',
        bed_fallback: 'बेड #{{id}}',
        room: 'कमरा',
        building: 'बिल्डिंग',
        available_badge: 'उपलब्ध',
        view_more: '{{count}} और देखें →'
      },
      cashflow: {
        title: 'कैशफ्लो',
        tabs: {
          overview: 'ओवरव्यू',
          expenses: 'खर्चे',
          weekdays: 'सप्ताह के दिन'
        },
        error: {
          title: 'लोड करने में विफल',
          retry: 'पुनः प्रयास करें'
        },
        charts: {
          income_vs_expenses: 'आय बनाम खर्चे'
        },
        series: {
          income: 'आय',
          expenses: 'खर्चे'
        },
        kpis: {
          title: 'मुख्य मीट्रिक्स',
          total_income: 'कुल आय',
          total_expenses: 'कुल खर्चे',
          average_net: 'औसत नेट'
        },
        expenses: {
          category_share: 'श्रेणी भागीदारी'
        },
        table: {
          category: 'श्रेणी',
          amount: 'राशि',
          percentage: 'प्रतिशत',
          total: 'कुल'
        },
        weekdays: {
          title: 'सप्ताह के दिनों के अनुसार आय बनाम खर्चे'
        }
      },
      bookings_trend: {
        title: 'बुकिंग्स',
        tabs: { overview: 'अवलोकन', sources: 'स्रोत', trends: 'प्रवृत्तियाँ' },
        status_distribution: 'स्थिति का वितरण',
        count: 'गिनती',
        key_metrics: 'मुख्य मीट्रिक्स',
        total_bookings: 'कुल बुकिंग्स',
        total_revenue: 'कुल राजस्व',
        booking_rate: 'बुकिंग दर',
        cancellation_rate: 'रद्द दर',
        booking_sources_rate: 'बुकिंग स्रोत दर',
        source_details: 'स्रोत विवरण',
        source: 'स्रोत',
        bookings: 'बुकिंग्स',
        bookings_short: 'बुकिंग्स',
        conv_short: 'कन्व',
        conversion_rate: 'रूपांतरण दर',
        market_share: 'बाजार हिस्सेदारी',
        daily_booking_pattern: 'दैनिक बुकिंग पैटर्न',
        daily_bookings: 'दैनिक बुकिंग्स'
      },
      tenant_snapshot: {
        title: 'किरायेदार सारांश',
        view_all: 'सभी देखें',
        total_tenants: 'कुल किरायेदार',
        upcoming_checkins: 'आने वाले चेक-इन',
        upcoming_checkouts: 'आने वाले चेक-आउट',
        selected_buildings: 'चयनित इमारतें',
        recent_tenants: 'हाल के किरायेदार',
        open: 'खोलें',
        no_tenants: 'कोई किरायेदार नहीं मिला।',
        view_more: 'और देखें'
      },
      occupancy: {
        title: 'लाइव अधिभोग',
        occupied_chip: 'अधिभोग',
        buildings_label: 'इमारतें',
        all: 'सभी',
        beds_considered: 'विचारित बेड',
        empty: 'चयनित इमारतों के लिए कोई बेड नहीं मिले। अधिभोग देखने के लिए फ़िल्टर समायोजित करें।',
        aria_overall: 'कुल अधिभोग',
        legend: { occupied: 'व्याप्त', reserved: 'आरक्षित', maintenance: 'रखरखाव', available: 'उपलब्ध' },
        stats: { total: 'कुल', occupied: 'व्याप्त', reserved: 'आरक्षित', maintenance: 'रखरखाव', available: 'उपलब्ध', occupied_pct: 'व्याप्त', available_pct: 'उपलब्ध' },
        beds_with_count: '{{count}} बेड'
      },
      header: { greeting: { morning: 'शुभ प्रभात', afternoon: 'शुभ अपराह्न', evening: 'शुभ संध्या' }, subtitle: 'आपका डैशबोर्ड तैयार है।' }
    },
  }
};

export default hi;
