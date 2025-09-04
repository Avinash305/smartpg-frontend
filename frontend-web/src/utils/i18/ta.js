const ta = {
  translation: {
    nav: { 
      title: 'PG மேலாளர்', 
      notifications: 'அறிவிப்புகள்', 
      unread: '{{count}} படிக்கப்படவில்லை', 
      loading: 'ஏற்றுகிறது…', 
      close: 'மூடு', 
      none: 'அறிவிப்புகள் இல்லை', 
      refresh: 'புதுப்பி', 
      more: 'மேலும்', 
      profile: 'உங்கள் சுயவிவரம்', 
      settings: 'அமைப்புகள்', 
      sign_out: 'வெளியேறு',
      user: 'பயனர்',
      filter_by_buildings: 'கட்டிடங்களால் வடிகட்டு',
      all_buildings: 'அனைத்து கட்டிடங்கள்',
      n_selected: '{{count}} தேர்வு',
      select_all: 'அனைத்தையும் தேர்வு செய்',
      clear: 'க்ளியர்' 
    },
    sidebar: { 
      dashboard: 'டாஷ்போர்டு', 
      buildings: 'கட்டிடங்கள்', 
      tenants: 'வாடகையாளர்கள்', 
      income: 'வருமானம்', 
      expenses: 'செலவுகள்', 
      bookings: 'முன்பதிவுகள்', 
      payments: 'கொடுப்பனவுகள்', 
      messages: 'செய்திகள்', 
      settings: 'அமைப்புகள்', 
      reports: 'அறிக்கைகள்', 
      staffs: 'பணியாளர்கள்' 
    },
    login: { 
      login_as: 'உள்நுழைய', 
      select_role: 'பாத்திரத்தைத் தேர்ந்தெடுக்கவும்', 
      role_pg_admin: 'PG நிர்வாகி', 
      role_pg_staff: 'PG பணியாளர்', 
      email: 'மின்னஞ்சல் முகவரி', 
      email_placeholder: 'உங்கள் மின்னஞ்சலை உள்ளிடவும்', 
      password: 'கடவுச்சொல்', 
      password_placeholder: 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்', 
      remember_me: 'என்னை நினைவில் கொள்', 
      forgot_password: 'கடவுச்சொல்லை மறந்துவிட்டீர்களா?', 
      sign_in: 'சைன் இன்', 
      signing_in: 'சைன் இன் செய்கிறது...', 
      no_account: 'கணக்கு இல்லை?', 
      sign_up: 'பதிவு செய்', 
      success: 'உள்நுழைவு வெற்றி! மாற்றி விடப்படுகிறது...', 
      errors: { 
        select_role: 'தயவு செய்து பாத்திரத்தைத் தேர்ந்தெடுக்கவும்', 
        email_required: 'மின்னஞ்சல் தேவையானது', 
        email_invalid: 'மின்னஞ்சல் தவறானது', 
        password_required: 'கடவுச்சொல் தேவையானது', 
        failed: 'உள்நுழைவு தோல்வியடைந்தது. தயவுசெய்து சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' } 
    },
    buildings: { 
      name: 'பெயர்', 
      city: 'நகரம்', 
      state: 'மாநிலம்', 
      type: 'வகை', 
      status: 'நிலை', 
      active: 'செயலில்', 
      inactive: 'செயலற்றது', 
      actions: 'செயல்கள்', 
      list: 'பட்டியல்', 
      cards: 'அட்டைகள்',
      overview: 'மேலோட்டம்',
      no_buildings: 'கட்டிடங்கள் எதுவும் கிடைக்கவில்லை', 
      loading: 'கட்டிடங்களை ஏற்றுகிறது...', 
      permission_denied: 'ஏதேனும் கட்டிடங்களைப் பார்க்க உங்களுக்கு அனுமதி இல்லை', 
      load_failed: 'கட்டிடங்களை ஏற்றுவதில் தோல்வி', 
      view_details: 'விவரங்களைப் பார்க்க', 
      address: 'முகவரி:', 
      notes: 'குறிப்புகள்:', 
      type_boys: 'ஆண்', 
      type_girls: 'பெண்', 
      type_coliving: 'கூட்டு வாழ்வு',
      building_with_id: 'கட்டிடம் {{id}}',
      title: 'கட்டிடங்கள்',
      add_building: 'கட்டிடம் சேர்க்க',
      edit_building_title: 'கட்டிடம் தொகுப்பு: {{name}}',
      address_label: 'முகவரி',
      notes_label: 'குறிப்புகள்',
      back: 'பின்செல்',
      view_on_maps: 'வரைபடத்தில் காண்',
      open_in_maps: 'Google Maps-ல் திற',
      floors_label: 'மாடிகள்',
      rooms_label: 'அறைகள்',
      beds_label: 'படுக்கைகள்',
      code: 'குறியீடு',
      pincode: 'அஞ்சல் குறியீடு',
      manager: 'மேலாளர்',
      created: 'உருவாக்கப்பட்டது',
      updated: 'புதுப்பிக்கப்பட்டது',
      not_found: 'கட்டிடம் கிடைக்கவில்லை.',
      updated_success: 'கட்டிடம் புதுப்பிக்கப்பட்டது',
      property_type: 'சொத்து வகை',
      total_tenants: 'மொத்த வாடகையாளர்கள்',
      pg_capacity: 'PG திறன்',
      room_occupancy: 'அறை ஆக்கிரமிப்பு',
      bed_occupancy: 'படுக்கை ஆக்கிரமிப்பு',
      tooltip_occupied: '{{pct}}% ஆக்கிரமிப்பு',
      tooltip_available: '{{pct}}% கிடைக்கும்',
      tooltip_maintenance: '{{pct}}% பராமரிப்பு',
      available: 'கிடைக்கும்',
      occupied: 'ஆக்கிரமிப்பு',
      reserved: 'முன்பதிவு',
      maintenance_short: 'பராம.',
      action_edit: 'தொகு',
      action_inactive_soft_deleted: 'செயலற்றது (Soft Delete)',
      action_soft_delete: 'Soft Delete',
      action_delete_permanently: 'நிரந்தரமாக நீக்கு',
      confirm_delete_title: 'கட்டிடத்தை நீக்கு',
      confirm_soft_delete_title: 'கட்டிடத்தை செயலற்றதாக்கு',
      confirm_delete_message: '"{{name}}" நிரந்தரமாக நீக்கப்படும். இந்த செயலை மீட்க முடியாது.',
      confirm_soft_delete_message: '"{{name}}"-ஐ செயலற்றதாக்கவா? பின்னர் Active-ஐ true ஆக அமைத்து மீட்டெடுக்கலாம்.',
      cancel: 'ரத்து',
      soft_delete: 'Soft Delete',
      delete_hold_shift: 'நீக்கு (Shift அழுத்தி)',
      permission_edit_deny: 'இந்த கட்டிடத்தைத் திருத்த உங்களுக்கு அனுமதி இல்லை.',
      permission_delete_deny: 'இந்த கட்டிடத்தை நீக்க உங்களுக்கு அனுமதி இல்லை.',
      toasts_marked_inactive: 'கட்டிடம் செயலற்றது செய்யப்பட்டது',
      toasts_soft_delete_failed: 'Soft delete தோல்வி',
      toasts_deleted_permanently: 'கட்டிடம் நிரந்தரமாக நீக்கப்பட்டது',
      toasts_delete_failed: 'நீக்கம் தோல்வி',
      toasts_hold_shift_to_confirm: 'நிரந்தர நீக்கத்தை உறுதிப்படுத்த Shift அழுத்தி நீக்கு சொடுக்கவும்',
      stats_loading: 'புள்ளிவிவரங்கள் ஏற்றுகிறது…',
      stats_load_failed: 'புள்ளிவிவரங்கள் ஏற்றலில் தோல்வி',
      placeholders: { name: 'கட்டிடம் பெயர்', address: 'முகவரியை உள்ளிடவும்', city: 'நகரம் உள்ளிடவும்', state: 'மாநிலம் உள்ளிடவும்', pincode: '6 இலக்கம்', code: 'விருப்ப', notes: 'மேலும் தகவல்...' },
      errors: { owner_required: 'உரிமையாளர் தேவை', name_required: 'பெயர் தேவை', address_required: 'முகவரி தேவை', city_required: 'நகரம் தேவை', state_required: 'மாநிலம் தேவை', pincode_invalid: 'அஞ்சல் குறியீடு 6 இலக்கமாக இருக்க வேண்டும்', please_fix_fields: 'ஒளிவிடப்பட்ட புலங்களை சரிசெய்க' },
      permissions: { no_permission_edit_buildings: 'கட்டிடங்களை திருத்த அனுமதி இல்லை', no_permission_add_buildings: 'கட்டிடங்களைச் சேர்க்க அனுமதி இல்லை', permission_denied_cannot_edit_building: 'அனுமதி மறுக்கப்பட்டது: இந்த கட்டிடத்தைத் திருத்த முடியாது.', permission_denied_cannot_add_buildings: 'அனுமதி மறுக்கப்பட்டது: கட்டிடங்களைச் சேர்க்க முடியாது.' },
      update: 'புதுப்பி',
      toasts: { building_updated: 'கட்டிடம் புதுப்பிக்கப்பட்டது: {{name}}', building_created: 'கட்டிடம் உருவாக்கப்பட்டது: {{name}}' }
    },
    floors: {
      floor: 'மாடி',
      floors: 'மாடிகள்',
      building: 'கட்டிடம்',
      notes: 'குறிப்புகள்',
      actions: 'செயல்கள்',
      list: 'பட்டியல்',
      cards: 'அட்டைகள்',
      overview: 'மேலோட்டம்',
      no_floors: 'மாடிகள் எதுவும் கிடைக்கவில்லை',
      no_floors_for_building: 'இந்த கட்டிடத்திற்கு மாடிகள் இல்லை',
      loading: 'மாடிகளை ஏற்றுகிறது...',
      permission_denied: 'மாடிகளைப் பார்க்க உங்களுக்கு அனுமதி இல்லை',
      permission_denied_for_building: 'இந்த கட்டிடத்தின் மாடிகளைப் பார்க்க உங்களுக்கு அனுமதி இல்லை',
      load_failed: 'மாடிகளை ஏற்றுவதில் தோல்வி',
      view_details: 'விவரங்களைப் பார்க்க',
      rooms: 'அறைகள்',
      beds: 'படுக்கைகள்',
      capacity: 'திறன்',
      room_occupancy: 'அறை நிரப்பு',
      bed_occupancy: 'படுக்கை நிரப்பு',
      tooltip_occupied: '{{pct}}% ஆக்கிரமிக்கப்பட்டது',
      tooltip_available: '{{pct}}% கிடைக்கிறது',
      floor_label_unknown: 'தெரியாதது',
      floor_label_ground: 'தரைத்தளம்',
      floor_label_suffix: 'மாடி',
      titles: {
        title: 'மாடிகள்',
        add_floor: 'மாடி சேர்க்க',
        edit_floor_title: 'மாடி தொகுப்பு: {{name}}',
        edit_floor: 'மாடி திருத்த'
      },
      placeholders: {
        select_building: 'கட்டிடம் தேர்வு செய்க',
        select_floor: 'மாடி தேர்வு செய்க'
      },
      errors: {
        building_required: 'கட்டிடம் தேவையானது',
        number_required: 'எண் தேவையானது',
        number_numeric: 'எண் இலக்கமாக இருக்க வேண்டும்',
        number_range: 'எண் 0 மற்றும் 14 ஆகியவற்றுக்கிடையில் இருக்க வேண்டும்',
        duplicate_for_building: 'தேர்ந்த கட்டிடத்திற்கு இந்த மாடி ஏற்கனவே உள்ளது.'
      },
      permissions: {
        reason_edit: 'இந்த கட்டிடத்திற்கு மாடியைத் திருத்த உங்களுக்கு அனுமதி இல்லை.',
        reason_add: 'மாடி சேர்க்க உங்களுக்கு அனுமதி இல்லை.',
        deny_edit: 'அனுமதி மறுக்கப்பட்டது: இந்த கட்டிடத்திற்கு மாடி திருத்த முடியாது.',
        deny_add: 'அனுமதி மறுக்கப்பட்டது: மாடி சேர்க்க முடியாது.',
        deny_delete: 'அனுமதி மறுக்கப்பட்டது: இந்த கட்டிடத்திற்கு மாடியை நீக்க முடியாது.'
      },
      buttons: {
        save_changes: 'மாற்றங்களை சேமிக்க',
        create_floor: 'மாடி உருவாக்கு'
      },
      toasts: {
        floor_updated: 'மாடி புதுப்பிக்கப்பட்டது: {{name}}',
        floor_created: 'மாடி உருவாக்கப்பட்டது: {{name}}',
        created_success: 'மாடி உருவாக்கப்பட்டது',
        updated_success: 'மாடி புதுப்பிக்கப்பட்டது'
      },
      save_failed: 'மாடி சேமிக்க இயலவில்லை',
      action_edit: 'தொகு',
      action_inactive_soft_deleted: 'செயலற்றது (Soft Delete)',
      action_soft_delete: 'Soft Delete',
      action_delete_permanently: 'நிரந்தரமாக நீக்கு',
      confirm_delete_title: 'மாடியை நீக்கு',
      confirm_soft_delete_title: 'மாடியை செயலற்றதாக்கு',
      confirm_delete_message: '"{{name}}" நிரந்தரமாக நீக்கப்படும். இந்த செயலை மீட்க முடியாது.',
      confirm_soft_delete_message: '"{{name}}"-ஐ செயலற்றதாக்கவா? பின்னர் Active-ஐ true ஆக அமைத்து மீட்டெடுக்கலாம்.',
      cancel: 'ரத்து',
      soft_delete: 'Soft Delete',
      delete_hold_shift: 'நீக்கு (Shift அழுத்தி)',
      toasts_marked_inactive: 'மாடி செயலற்றது செய்யப்பட்டது',
      toasts_soft_delete_failed: 'Soft delete தோல்வி',
      toasts_deleted_permanently: 'மாடி நிரந்தரமாக நீக்கப்பட்டது',
      toasts_delete_failed: 'நீக்கம் தோல்வி',
      toasts_hold_shift_to_confirm: 'நிரந்தர நீக்கத்தை உறுதிப்படுத்த Shift அழுத்தி நீக்கு சொடுக்கவும்',
    },
    rooms: {
      room: 'அறை',
      rooms: 'அறைகள்',
      floor: 'மாடி',
      type: 'வகை',
      capacity: 'திறன்',
      rent: 'வாடகை',
      deposit: 'டெப்பாசிட்',
      available: 'கிடைக்கும்',
      occupied: 'ஆக்கிரமிப்பு',
      reserved: 'முன்பதிவு',
      maintenance: 'பராமரிப்பு',
      yes: 'ஆம்',
      no: 'இல்லை',
      actions: 'செயல்கள்',
      list: 'பட்டியல்',
      cards: 'அட்டைகள்',
      no_rooms_for_floor: 'இந்த மாடிக்கு அறைகள் இல்லை',
      no_rooms: 'அறைகள் எதுவும் கிடைக்கவில்லை',
      view_details: 'விவரங்களைப் பார்க்க',
      loading: 'அறைகள் ஏற்றப்படுகின்றன...',
      permission_denied: 'அறைகளைப் பார்க்க உங்களுக்கு அனுமதி இல்லை',
      load_failed: 'அறைகளை ஏற்றுவதில் தோல்வி',
      titles: {
        title: 'அறைகள்',
        add_room: 'அறை சேர்க்க',
        edit_room_title: 'அறை தொகுப்பு: {{name}}',
        edit_room: 'அறை திருத்த'
      },
      labels: {
        number: 'அறை எண்',
        room_type: 'அறை வகை',
        monthly_rent: 'மாத வாடகை',
        security_deposit: 'பாதுகாப்பு டெப்பாசிட்',
        notes: 'குறிப்புகள்',
        active: 'செயலில்',
        beds: 'படுக்கைகள்',
        bed_number: 'படுக்கை எண்',
        status: 'நிலை',
        auto_number: 'தானாக எண்'
      },
      types: {
        single_sharing: 'ஒற்றை பகிர்வு',
        n_sharing: '{{n}} பேர் பகிர்வு'
      },
      errors: {
        floor_required: 'மாடி தேவையானது',
        number_required: 'அறை எண் தேவையானது',
        room_type_required: 'அறை வகை தேவையானது',
        capacity_required: 'திறன் தேவையானது',
        bed_number_required: 'ஒவ்வொரு படுக்கைக்கும் எண் அவசியம்',
        bed_number_unique: 'படுக்கை எண்கள் ஒவ்வொன்றும் தனித்துவமாக இருக்க வேண்டும்',
        number_duplicate: 'அறை எண் ஏற்கனவே உள்ளது'
      },
      permissions: {
        reason_edit: 'இந்த கட்டிடத்திற்கு அறையை திருத்த உங்களுக்கு அனுமதி இல்லை.',
        reason_add: 'அறை சேர்க்க உங்களுக்கு அனுமதி இல்லை.',
        reason_delete: 'இந்த கட்டிடத்திற்கு அறையை நீக்க உங்களுக்கு அனுமதி இல்லை.',
        deny_edit: 'அனுமதி மறுக்கப்பட்டது: இந்த கட்டிடத்திற்கு அறையைத் திருத்த முடியாது.',
        deny_add: 'அனுமதி மறுக்கப்பட்டது: அறை சேர்க்க முடியாது.',
        deny_delete: 'அனுமதி மறுக்கப்பட்டது: இந்த கட்டிடத்திற்கு அறையை நீக்க முடியாது.'
      },
      buttons: {
        save_changes: 'மாற்றங்களை சேமிக்க',
        create_room: 'அறை உருவாக்கு'
      },
      toasts: {
        updated_success: 'அறை புதுப்பிக்கப்பட்டது',
        created_success: 'அறை உருவாக்கப்பட்டது',
        marked_inactive: 'அறை செயலற்றதாக்கப்பட்டது',
        soft_delete_failed: 'Soft delete தோல்வி',
        deleted_permanently: 'அறை நிரந்தரமாக நீக்கப்பட்டது',
        delete_failed: 'நீக்கம் தோல்வி',
        hold_shift_to_confirm: 'நிரந்தர நீக்கத்தை உறுதிப்படுத்த Shift அழுத்தி நீக்கு சொடுக்கவும்'
      },
      save_failed: 'அறை சேமிக்க இயலவில்லை',
      action_edit: 'தொகு',
      action_inactive_soft_deleted: 'செயலற்றது (Soft Delete)',
      action_soft_delete: 'Soft Delete',
      action_delete_permanently: 'நிரந்தரமாக நீக்கு',
      confirm_delete_title: 'அறையை நீக்கு',
      confirm_soft_delete_title: 'அறையை செயலற்றதாக்கு',
      confirm_delete_message: '"{{name}}" நிரந்தரமாக நீக்கப்படும். இந்த செயலை மீட்க முடியாது.',
      confirm_soft_delete_message: '"{{name}}"-ஐ செயலற்றதாக்கவா? பின்னர் Active-ஐ true ஆக அமைத்து மீட்டெடுக்கலாம்.',
      cancel: 'ரத்து',
      soft_delete: 'Soft Delete',
      delete_hold_shift: 'நீக்கு (Shift அழுத்தி)'
    },
    beds: {
      title: 'படுக்கைகள்',
      bed: 'படுக்கை',
      beds: 'படுக்கைகள்',
      loading: 'படுக்கைகள் ஏற்றப்படுகின்றன...',
      no_beds: 'படுக்கைகள் எதுவும் இல்லை',
      no_beds_for_room: 'இந்த அறைக்கு படுக்கைகள் எதுவும் இல்லை',
      view_details: 'விவரங்களைக் காண்க',
      bed_with_number: 'படுக்கை {{n}}',
      number: 'படுக்கை எண்',
      auto_number: 'தானியங்கு எண் 1..N',
      available: 'கிடைக்கிறது',
      occupied: 'ஆக்கிரமிக்கப்பட்டது',
      maintenance: 'பராமரிப்பு',
      reserved: 'ஒதுக்கப்பட்டது',
      rent: 'வாடகை',
      monthly_rent: 'மாதாந்திர வாடகை',
      notes: 'குறிப்புகள்',
      status: 'நிலை',
      room: 'அறை',
      building: 'கட்டிடம்',
      floor: 'தளம்',
      tenant: 'குடியிருப்பாளர்',
      no_tenant: 'குடியிருப்பாளர் இல்லை',
      confirm_delete: 'இந்த படுக்கையை நிச்சயமாக நீக்க விரும்புகிறீர்களா?',
      delete_success: 'படுக்கை வெற்றிகரமாக நீக்கப்பட்டது',
      delete_error: 'படுக்கையை நீக்குவதில் பிழை',
      save_success: 'படுக்கை வெற்றிகரமாக சேமிக்கப்பட்டது',
      save_error: 'படுக்கையைச் சேமிப்பதில் பிழை',
      number_placeholder: 'உதா: B1, 1, A-01',
      rent_placeholder: 'உதா: 3500.00',
      notes_placeholder_maintenance: 'பராமரிப்புக்கான காரணம் (கட்டாயம்)',
      notes_placeholder_optional: 'விருப்பக் குறிப்புகள்',
      actions: {
        add_bed: 'படுக்கையைச் சேர்',
        edit_bed: 'படுக்கையைத் திருத்து',
        delete_bed: 'படுக்கையை நீக்கு',
        create_bed: 'படுக்கையை உருவாக்கு',
        check_out: 'வெளியேறு',
        confirm_checkout: 'வெளியேற்றத்தை உறுதிப்படுத்து'
      },
      dialogs: {
        delete_title: 'படுக்கையை நீக்கு',
        checkout_title: 'குடியிருப்பாளர் வெளியேற்றம்',
        delete_description: '"{{label}}" நிரந்தரமாக நீக்கப்படும். இந்த செயலை மீட்க முடியாது.',
        checkout_description: 'தற்போதைய குடியிருப்பாளரை "{{label}}" யிலிருந்து வெளியேற்ற விரும்புகிறீர்களா? இன்றைய தேதி உண்மையான வெளியேற்றமாக அமைக்கப்படும்.'
      },
      toasts: {
        created: 'படுக்கை வெற்றிகரமாக உருவாக்கப்பட்டது',
        updated: 'படுக்கை வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
        updated_success: 'படுக்கை வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
        checked_out_success: 'வாடகையாளர் வெற்றிகரமாக செக்-அவுட் செய்யப்பட்டார்',
        deleted_permanently: 'படுக்கை நிரந்தரமாக நீக்கப்பட்டது'
      },
      errors: {
        checkout_failed: 'செக்-அவுட் தோல்வி',
        delete_failed: 'நீக்குதல் தோல்வி',
        save_failed: 'படுக்கையைச் சேமிப்பதில் தோல்வி',
        load_failed: 'படுக்கைகளை ஏற்றுவதில் தோல்வி'
      },
      validation: {
        number_required: 'படுக்கை எண் தேவை',
        number_unique: 'இந்த படுக்கை எண் ஏற்கனவே உள்ளது',
        room_required: 'அறை தேவை',
        room_at_capacity: 'மேலும் படுக்கைகளை சேர்க்க முடியாது. அறையின் கொள்ளளவு {{capacity}} மற்றும் அதில் ஏற்கனவே {{count}} படுக்கை(கள்) உள்ளன.',
        maintenance_reason_required: 'பராமரிப்பு நிலையை அமைக்கும்போது ஒரு காரணத்தை வழங்கவும்.',
        rent_non_negative: 'மாதாந்திர வாடகை ஒரு எதிர்மறையற்ற எண்ணாக இருக்க வேண்டும்'
      },
      statuses: {
        available: 'கிடைக்கிறது',
        occupied: 'ஆக்கிரமிக்கப்பட்டது',
        maintenance: 'பராமரிப்பு',
        reserved: 'ஒதுக்கப்பட்டது'
      },
      columns: {
        number: 'படுக்கை #',
        status: 'நிலை',
        rent: 'வாடகை'
      },
      history: {
        title_for_label: '{{label}} க்கான படுக்கை வரலாறு',
        description: 'இந்த படுக்கைக்கான சமீபத்திய தங்குமிடங்கள் மற்றும் முன்பதிவுகள்',
        occupied_no_history_hint: 'முன்பதிவு காரணமாக படுக்கை ஆக்கிரமிக்கப்பட்டதாக குறிக்கப்பட்டுள்ளது, ஆனால் இன்னும் தங்குமிட வரலாறு இல்லை. படுக்கை பயன்பாட்டு வரலாற்றைக் கண்காணிக்க ஒரு தங்குமிடத்தை உருவாக்கவும்.',
        no_history: 'வரலாறு எதுவும் கிடைக்கவில்லை'
      }
    },
    settings: {
      page: {
        language: { 
          title: 'மொழி', 
          subtitle: 'உங்களுக்கு விருப்பமான பயன்பாட்டு மொழியைத் தேர்ந்தெடுக்கவும்.', 
          label: 'மொழி', 
          current: 'தற்போது' 
        },
        localization: {
          cancel: 'ரத்து'
        }
      }
    },
    common: { 
      save: 'சேமி', 
      saving: 'சேமித்து வருகிறது…', 
      load_more: 'மேலும் ஏற்று',
      actions: 'செயல்கள்',
      edit: 'தொகு',
      delete_permanently: 'நிரந்தரமாக நீக்கு',
      cancel: 'ரத்து',
      confirm: 'உறுதிப்படுத்து',
      delete_hold_shift: 'நீக்கு (Shift அழுத்தி)',
      hold_shift_to_confirm: 'நிரந்தர நீக்கத்தை உறுதிப்படுத்த Shift அழுத்தி Delete சொடுக்கவும்',
      date_ranges: {
        today: 'இன்று',
        yesterday: 'நேற்று',
        last7: 'கடந்த 7 நாட்கள்',
        last15: 'கடந்த 15 நாட்கள்',
        last30: 'கடந்த 30 நாட்கள்',
        this_month: 'இந்த மாதம்',
        last_month: 'கடந்த மாதம்',
        this_year: 'இந்த ஆண்டு',
        last_year: 'கடந்த ஆண்டு',
        range: 'வரம்பு'
      }
    },
    toasts: { 
      must_login: 'மொழியைப் புதுப்ப உள்நுழைக.', 
      language_saved: 'மொழி விருப்பம் சேமிக்கப்பட்டது.', 
      save_failed: 'மொழி சேமிக்க இயலவில்லை.' 
    },
    dashboard: {
      bed_availability: {
        title: 'படுக்கை கிடைப்புகள்',
        view_all: 'அனைத்தையும் காண்க',
        search_placeholder: 'படுக்கை, அறை, கட்டிடம் தேடு...',
        available_beds: 'கிடைக்கும் படுக்கைகள்',
        loading: 'ஏற்றுகிறது…',
        load_failed: 'ஏற்றுவதில் தோல்வி',
        empty: 'தேர்ந்தெடுக்கப்பட்ட கிடைக்கும் படுக்கைகள் எதுவும் இல்லை.',
        bed_fallback: 'படுக்கை #{{id}}',
        room: 'அறை',
        building: 'கட்டிடம்',
        available_badge: 'கிடைக்கும்',
        view_more: 'மேலும் {{count}} காண்க'
      },
      cashflow: {
        title: 'பணப்புழக்கம்',
        tabs: {
          overview: 'மேலோட்டம்',
          expenses: 'செலவுகள்',
          weekdays: 'வார நாட்கள்'
        },
        error: {
          title: 'ஏற்றுவதில் தோல்வி',
          retry: 'மீண்டும் முயற்சிக்கவும்'
        },
        charts: {
          income_vs_expenses: 'வருமானம் vs செலவுகள்'
        },
        series: {
          income: 'வருமானம்',
          expenses: 'செலவுகள்'
        },
        kpis: {
          title: 'முக்கிய அளவைகள்',
          total_income: 'மொத்த வருமானம்',
          total_expenses: 'மொத்த செலவுகள்',
          average_net: 'சராசரி நெட்'
        },
        expenses: {
          category_share: 'வகைப் பகிர்வு'
        },
        table: {
          category: 'வகை',
          amount: 'தொகை',
          percentage: 'சதவீதம்',
          total: 'மொத்தம்'
        },
        weekdays: {
          title: 'வார நாட்கள் அடிப்படையில் வருமானம் vs செலவுகள்'
        }
      },
      bookings_trend: {
        title: 'Bookings',
        tabs: { overview: 'Overview', sources: 'Sources', trends: 'Trends' },
        status_distribution: 'Status Distribution',
        count: 'Count',
        key_metrics: 'Key Metrics',
        total_bookings: 'Total Bookings',
        total_revenue: 'Total Revenue',
        booking_rate: 'Booking Rate',
        cancellation_rate: 'Cancellation Rate',
        booking_sources_rate: 'Booking Sources Rate',
        source_details: 'Source Details',
        source: 'Source',
        bookings: 'Bookings',
        bookings_short: 'bookings',
        conv_short: 'conv',
        conversion_rate: 'Conversion Rate',
        market_share: 'Market Share',
        daily_booking_pattern: 'Daily Booking Pattern',
        daily_bookings: 'Daily Bookings'
      },
      tenant_snapshot: {
        title: 'வாடகையாளர் சுருக்கம்',
        view_all: 'அனைத்தையும் காண்க',
        total_tenants: 'மொத்த வாடகையாளர்கள்',
        upcoming_checkins: 'வரவிருக்கும் செக்-இன்கள்',
        upcoming_checkouts: 'வரவிருக்கும் செக்-அவுட்கள்',
        selected_buildings: 'தேர்ந்தெடுக்கப்பட்ட கட்டிடங்கள்',
        recent_tenants: 'அண்மைய வாடகையாளர்கள்',
        open: 'திற',
        no_tenants: 'எந்த வாடகையாளரும் கிடைக்கவில்லை.',
        view_more: 'மேலும் காண்க'
      },
      occupancy: {
        title: 'நேரடி ஆக்கிரமிப்பு',
        occupied_chip: 'ஆக்கிரமிக்கப்பட்ட',
        buildings_label: 'கட்டிடங்கள்',
        all: 'அனைத்தும்',
        beds_considered: 'கருதப்பட்ட படுக்கைகள்',
        empty: 'தேர்விற்கான கிடைக்கும் படுக்கைகள் எதுவும் இல்லை. ஆக்கிரமிப்பைக் காண வடிகட்டியை சரிசெய்க.',
        aria_overall: 'மொத்த ஆக்கிரமிப்பு',
        legend: { occupied: 'ஆக்கிரமிப்பு', reserved: 'முன்பதிவு', maintenance: 'பராமரிப்பு', available: 'கிடைக்கும்' },
        stats: { total: 'மொத்தம்', occupied: 'ஆக்கிரமிப்பு', reserved: 'முன்பதிவு', maintenance: 'பராமரிப்பு', available: 'கிடைக்கும்', occupied_pct: 'ஆக்கிரமிப்பு', available_pct: 'கிடைக்கும்' },
        beds_with_count: '{{count}} படுக்கைகள்'
       },
      header: { 
        greeting: { 
          morning: 'காலை வணக்கம்', 
          afternoon: 'மதிய வணக்கம்', 
          evening: 'மாலை வணக்கம்' 
        }, 
        subtitle: 'உங்கள் டாஷ்போர்டு தயாராக உள்ளது.' 
      }
    },
  }
};

export default ta;
