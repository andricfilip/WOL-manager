from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_required, current_user
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime
from config import config
from models import db, User, Computer, WOLLog, ShutdownLog, AuditLog, ComputerGroup, UptimeLog, AppSettings, UserComputerPreference
from wol import send_wol_packet, validate_mac_address, check_host_status, shutdown_computer_ssh
from encryption import verify_encryption_setup
from security import init_security, admin_required, validate_admin_status
import app_config  # Application branding and configuration
import auth
import os
import threading
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_real_ip():
    """Get real client IP from X-Forwarded-For (nginx proxy) or remote_addr."""
    fwd = request.headers.get('X-Forwarded-For')
    if fwd:
        return fwd.split(',')[0].strip()
    return request.headers.get('X-Real-IP', request.remote_addr).strip()


app = Flask(__name__)
app.config.from_object(config[os.environ.get('FLASK_ENV', 'development')])

# Initialize extensions
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize security middleware
init_security(app)

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[app.config.get('RATELIMIT_DEFAULT', "200 per hour")],
    storage_uri=app.config.get('RATELIMIT_STORAGE_URL', "memory://")
)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Molim prijavite se da pristupite ovoj stranici'

# Register blueprints
app.register_blueprint(auth.auth_bp)

# Inject app configuration into all templates
@app.context_processor
def inject_app_config():
    """Make app configuration available to all templates"""
    return {
        'app_info': app_config.get_app_info(),
        'app_colors': app_config.get_theme_colors()
    }

# Language translations (SR/EN)
TRANSLATIONS = {
    'sr': {
        # Navigation
        'nav_dashboard': 'Dashboard',
        'nav_preferences': 'Podešavanja računara',
        'nav_statistics': 'Statistika',
        'nav_admin': 'Admin',
        'nav_history': 'Istorija',
        'nav_logout': 'Odjava',
        # History page
        'history_title': 'Wake-on-LAN Istorija',
        'search_label': 'Pretraga',
        'search_placeholder': 'Ime računara ili korisnika...',
        'date_from_label': 'Od datuma',
        'date_to_label': 'Do datuma',
        'btn_filter': 'Filtriraj',
        'btn_reset': 'Resetuj',
        'col_computer': 'Računar',
        'col_user': 'Korisnik',
        'col_timestamp': 'Vreme',
        'col_status': 'Status',
        'no_logs': 'Nema pronađenih logova',
        'no_filter_results': 'Nema rezultata za zadati filter',
        'delete_logs': 'Obriši Logove',
        'status_sent': 'Poslato',
        'status_failed': 'Greška',
        # Settings
        'settings_lang_label': 'Jezik aplikacije',
        'settings_lang_desc': 'Jezik korisničkog interfejsa za sve korisnike.',
        'settings_title': 'Podešavanja aplikacije',
        'settings_features_title': 'Funkcionalnosti',
        'settings_features_desc': 'Uključite ili isključite određene funkcionalnosti aplikacije',
        'settings_groups_label': 'Grupe računara',
        'settings_groups_desc': 'Omogućava organizaciju računara u grupe za lakše upravljanje. Preporučeno za veće mreže.',
        'settings_search_label': 'Pretraživanje',
        'settings_search_desc': 'Omogućava pretraživanje računara po nazivu i MAC adresi. Manje korisno za male mreže sa nekoliko računara.',
        'settings_save_btn': 'Sačuvaj podešavanja',
        'settings_sysinfo_title': 'Informacije o sistemu',
        'back_label': 'Nazad',
        # Common status
        'status_online': 'Online',
        'status_offline': 'Offline',
        'status_unknown': 'Nepoznato',
        # Common buttons
        'btn_edit': 'Izmeni',
        'btn_delete': 'Obriši',
        'btn_save': 'Sačuvaj',
        'btn_cancel': 'Otkaži',
        'btn_add': 'Dodaj',
        'btn_help': 'Pomoć',
        'btn_close': 'Zatvori',
        'btn_wake': 'Uključi',
        'btn_shutdown': 'Ugasi',
        'btn_terminal': 'Terminal',
        'col_actions': 'Akcije',
        'col_name': 'Naziv',
        # Dashboard
        'dash_title': 'Moji Računari',
        'dash_search_ph': 'Pretraži po nazivu, IP adresi, MAC adresi...',
        'dash_check_status': 'Proveri status',
        'dash_checking': 'Proveravam...',
        'dash_wake_all': 'Uključi sve',
        'dash_ungrouped': 'Moji računari',
        'dash_no_results': 'Nema rezultata pretrage',
        'dash_no_computers': 'Nemate dodeljenih računara',
        'dash_no_computers_sub': 'Kontaktirajte administratora da vam dodeli pristup računarima',
        'dash_opis': 'Opis',
        'dash_last_wol': 'Poslednji WoL',
        'dash_last_shutdown': 'Poslednje gašenje',
        'dash_checked': 'Provereno',
        'stat_total': 'Ukupno',
        'sending': 'Šaljem...',
        'shutting_down': 'Gašenje...',
        # Dashboard JS confirmations/alerts
        'confirm_shutdown': 'Ugasiti računar',
        'confirm_wake_group': 'Uključiti sve računare u grupi',
        'wol_sent': 'WoL paket poslat na',
        'shutdown_success': 'uspešno ugašen',
        'error_prefix': 'Greška',
        'status_error': 'Greška',
        # Admin Computers
        'page_admin_comp': 'Upravljanje Računarima',
        'btn_add_computer': 'Dodaj Računar',
        'btn_users_nav': 'Korisnici',
        'btn_groups_nav': 'Grupe',
        'btn_settings_nav': 'Podešavanja',
        'col_mac': 'MAC Adresa',
        'col_ip': 'IP Adresa',
        'col_assigned_users': 'Dodeljeni Korisnici',
        'no_assigned_users': 'Nema dodeljenih korisnika',
        'more_users_suffix': 'još',
        'no_computers_msg': 'Nema računara u sistemu',
        'add_first_computer': 'Dodaj Prvi Računar',
        'confirm_delete_comp': 'Da li ste sigurni da želite da obrišete računar',
        'comp_deleted': 'je obrisan',
        # Admin Users
        'page_admin_users': 'Upravljanje Korisnicima',
        'btn_add_user_nav': 'Dodaj Korisnika',
        'back_to_computers': 'Nazad na računare',
        'back_to_users': 'Nazad na korisnike',
        'back_to_groups': 'Nazad na grupe',
        'badge_admin_label': 'Admin',
        'badge_user_label': 'Korisnik',
        'col_username': 'Korisničko ime',
        'col_email': 'Email',
        'col_role': 'Uloga',
        'col_joined': 'Registrovan',
        'groups_can_view': 'Vidi grupe',
        'groups_no_view': 'Bez grupa',
        'btn_role_toggle': 'Uloga',
        'btn_change_role': 'Promeni Ulogu',
        'your_account_label': 'Vaš nalog',
        'modal_edit_user_title': 'Izmeni Korisnika',
        'modal_save': 'Sačuvaj',
        'all_fields_required': 'Sva polja su obavezna',
        'confirm_del_user': 'Da li ste sigurni da želite da obrišete korisnika',
        'confirm_toggle_admin': 'Da li ste sigurni da želite promeniti admin status?',
        'confirm_toggle_groups': 'Da li ste sigurni da želite promeniti dozvolu za grupe?',
        'no_users_found': 'Nema korisnika',
        # Admin Groups
        'page_admin_groups': 'Grupe Računara',
        'btn_new_group': 'Nova Grupa',
        'no_comp_in_group': 'Nema dodeljenih računara',
        'comp_count_suffix': 'računar(a)',
        'groups_empty_msg': 'Nema kreiranih grupa',
        'groups_empty_hint': 'Kreirajte grupe da organizujete računare',
        'delete_group_confirm': 'Da li ste sigurni da želite da obrišete grupu',
        'delete_group_note': 'Računari neće biti obrisani.',
        # Computer form
        'page_add_comp': 'Dodaj Novi Računar',
        'page_edit_comp': 'Izmeni Računar',
        'comp_name_label': 'Naziv Računara',
        'comp_mac_label': 'MAC Adresa',
        'comp_mac_hint': 'Format: AA:BB:CC:DD:EE:FF ili AA-BB-CC-DD-EE-FF',
        'comp_ip_label': 'IP Adresa (opciono)',
        'comp_desc_label': 'Opis (opciono)',
        'comp_os_label': 'Operativni sistem',
        'comp_os_unknown': 'Nepoznat',
        'comp_os_hint': 'Bitno za SSH shutdown komande',
        'ssh_config_section': 'SSH Konfiguracija (za gašenje računara)',
        'ssh_host_label': 'SSH Host',
        'ssh_host_hint': 'Ostavi prazno ako SSH koristi istu adresu kao IP adresa',
        'ssh_port_label': 'SSH Port',
        'ssh_user_label': 'SSH Korisničko ime',
        'ssh_pass_label': 'SSH Lozinka',
        'ssh_pass_hint_empty': 'Ostavi prazno ako ne koristiš SSH',
        'ssh_pass_hint_set': 'Postavi novu ili ostavi prazno',
        'ssh_already_has_pass': 'Već postoji lozinka.',
        'ssh_keep_existing': 'Ostavi prazno da zadržiš postojeću.',
        'ssh_pass_encrypted': 'Lozinka se čuva enkriptovano.',
        'ssh_auto_login_label': 'SSH Auto-Login',
        'ssh_auto_on_desc': 'Ako je uključeno: koristi SSH lozinku za auto-login u terminalu',
        'ssh_auto_off_desc': 'Ako je isključeno: korisnik će trebati ručno da unese šifru',
        'assign_users_label': 'Dodeli Korisnicima',
        'no_users_in_system': 'Nema korisnika u sistemu',
        'toggle_access_hint': 'Uključite toggle za korisnike kojima želite dati pristup ovom računaru.',
        'btn_save_changes': 'Sačuvaj Izmene',
        'role_viewer_opt': 'Viewer (samo pregled)',
        'role_operator_opt': 'Operator (pali/gasi)',
        'role_owner_opt': 'Owner (menja uređaj/SSH)',
        # Group form
        'page_add_group': 'Nova Grupa',
        'page_edit_group': 'Izmeni Grupu',
        'group_name_label': 'Naziv grupe',
        'group_desc_label': 'Opis',
        'group_color_label': 'Boja',
        'group_icon_label': 'Ikonica',
        'allowed_actions_label': 'Dozvoljene Akcije',
        'actions_info_desc': 'Izaberite koje akcije korisnici mogu izvršavati nad računarima u ovoj grupi',
        'allow_wake_label': 'Upali računare (Wake-on-LAN)',
        'allow_wake_desc': 'Korisnici mogu uključivati računare u ovoj grupi',
        'allow_shutdown_label': 'Ugasi računare (SSH Shutdown)',
        'allow_shutdown_desc': 'Korisnici mogu gasiti računare u ovoj grupi (zahteva SSH)',
        'actions_warning': 'Ako nijedna akcija nije izabrana, korisnici neće moći kontrolisati računare u grupi.',
        'comp_in_group_label': 'Računari u grupi',
        'search_comp_ph': 'Pretraži po nazivu, IP ili MAC adresi...',
        'no_ip_label': 'Bez IP',
        # Add user form
        'page_add_user': 'Dodaj Novog Korisnika',
        'username_label': 'Korisničko ime',
        'email_label': 'Email',
        'password_label': 'Lozinka',
        'admin_priv_label': 'Admin privilegije',
        'admin_priv_desc': 'Admin može dodavati/brisati korisnike i računare',
        'btn_add_user_form': 'Dodaj Korisnika',
        'note_section_title': 'Napomena',
        'note_unique_username': 'Korisničko ime mora biti jedinstveno',
        'note_valid_email': 'Email mora biti validan i jedinstven',
        'note_min_password': 'Lozinka mora imati najmanje 6 karaktera',
        'note_admin_rights': 'Admin korisnici mogu upravljati svim funkcijama sistema',
        # Login
        'login_username': 'Korisničko ime',
        'login_password': 'Lozinka',
        'login_remember': 'Zapamti me',
        'login_btn': 'Prijava',
        'login_contact': 'Kontaktirajte administratora za pristup',
        # Profile
        'profile_title': 'Korisnički profil',
        'profile_edit_section': 'Izmeni Profil',
        'profile_change_pw': 'Promena lozinke',
        'label_role': 'Uloga',
        'label_member_since': 'Član od',
        'label_current_pw': 'Trenutna lozinka',
        'label_new_pw': 'Nova lozinka',
        'label_confirm_pw': 'Potvrdi novu lozinku',
        'btn_save_profile': 'Sačuvaj Izmene',
        'btn_update_pw': 'Izmeni Lozinku',
        'role_admin_label': 'Administrator',
        'role_user_label': 'Regularni korisnik',
        'pw_mismatch': 'Lozinke se ne podudaraju',
        'pw_min_length': 'Lozinka mora imati najmanje 6 karaktera',
        # Statistics
        'stats_title': 'Statistika',
        'stats_24h': '24 sata',
        'stats_7d': '7 dana',
        'stats_30d': '30 dana',
        'stats_90d': '90 dana',
        'stats_online_now': 'Trenutno online',
        'stats_wol_total': 'WoL ukupno',
        'stats_shutdowns_total': 'Gašenja ukupno',
        'stats_avg_uptime': 'Prosečan uptime',
        'stats_status_chart': 'Status računara',
        'stats_activity_chart': 'Aktivnost',
        'stats_loading': 'Učitavam statistiku...',
        'stats_no_data': 'Nema podataka za prikaz',
        'stats_error': 'Greška pri učitavanju statistike',
        'stats_uptime_label': 'Uptime',
        'stats_shutdowns_label': 'Gašenja',
        'stats_day': 'dan',
        'stats_days': 'dana',
        # SSH notification in base.html
        'ssh_decrypt_fail_title': 'SSH lozinka ne može biti dekriptovana',
        'ssh_decrypt_fail_desc': 'Lozinka je sačuvana sa starim ključem i ne može se koristiti. Idite u podešavanja računara i ponovo unesite SSH lozinku.',
        'ssh_decrypt_fix_btn': 'Izmeni SSH lozinku',
        # Missing keys - aliases and additions
        'actions_warning_title': 'Napomena',
        'actions_warning_body': 'Ako nijedna akcija nije izabrana, korisnici neće moći kontrolisati računare u grupi.',
        'btn_save_group': 'Sačuvaj Grupu',
        'btn_save_settings': 'Sačuvaj podešavanja',
        'comp_desc_ph': 'Kratak opis računara...',
        'comp_mac_format_hint': 'Format: AA:BB:CC:DD:EE:FF ili AA-BB-CC-DD-EE-FF',
        'comp_os_unknown_opt': 'Nepoznat',
        'group_desc_ph': 'Kratak opis grupe (opciono)',
        'groups_feature_label': 'Grupe računara',
        'groups_feature_desc': 'Omogućava organizaciju računara u grupe za lakše upravljanje. Preporučeno za veće mreže.',
        'search_feature_label': 'Pretraživanje',
        'search_feature_desc': 'Omogućava pretraživanje računara po nazivu i MAC adresi. Manje korisno za male mreže.',
        'login_admin_contact': 'Kontaktirajte administratora za pristup',
        'login_btn_label': 'Prijava',
        'login_user_label': 'Korisničko ime',
        'login_user_ph': 'Unesite korisničko ime',
        'login_pass_label': 'Lozinka',
        'login_pass_ph': 'Unesite lozinku',
        'login_remember_label': 'Zapamti me',
        'page_settings': 'Podešavanja',
        'password_min_hint': 'Najmanje 6 karaktera',
        'username_min_hint': 'Najmanje 3 karaktera',
        'section_features': 'Funkcionalnosti',
        'section_features_desc': 'Uključite ili isključite određene funkcionalnosti aplikacije',
        'section_system_info': 'Informacije o sistemu',
        'ssh_pass_stored_enc': 'Lozinka se čuva enkriptovano u bazi',
        'ssh_set_new_or_keep': 'Već postoji lozinka.',
        'stats_unknown': 'Nepoznato',
        'stats_timeline_label': 'Vremenska osa aktivnosti',
        # Computer Preferences page
        'prefs_title': 'Podešavanja računara',
        'prefs_no_computers': 'Nemate dodeljenih računara.',
        'prefs_ssh_save_error': 'Ne mogu da sačuvam SSH podešavanje. Pokušaj ponovo.',
        'btn_edit_device': 'Izmeni uređaj',
        'ssh_enabled': 'Uključen',
        'ssh_disabled': 'Isključen',
        'ssh_autologin_enabled_by_admin': 'SSH Auto-Login je UKLJUČEN od strane admina',
        'ssh_autologin_disabled_by_admin': 'SSH Auto-Login je ISKLJUČEN od strane admina',
        'mac_no_change': 'MAC adresa se ne može menjati',
        # Register page
        'register_title': 'Registracija',
        'register_heading': 'Kreiraj novi nalog',
        'register_confirm_ph': 'Ponovi lozinku',
        'register_btn': 'Registruj se',
        'register_have_account': 'Već imate nalog?',
        'register_login_link': 'Prijavite se ovde',
        # Base - SSH modal
        'ssh_modal_password_ph': 'Unesite SSH lozinku...',
        'ssh_modal_login_btn': 'Prijavi se',
        'ssh_password_required': 'SSH lozinka je obavezna',
        # Base - role change toasts
        'access_removed_toast': 'Admin vam je uklonio pristup računaru',
        'access_granted_toast': 'Dodat vam je pristup novom računaru',
        # History - delete modal
        'del_logs_title': 'Brisanje Logova',
        'del_logs_range': 'Obriši logove za period',
        'del_logs_all': 'Obriši SVE logove',
        'del_logs_dates_required': 'Molimo unesite oba datuma za period brisanja.',
        'del_logs_confirm_range': 'Da li ste sigurni da želite obrisati sve logove od',
        'del_logs_confirm_all': 'Da li ste sigurni da želite obrisati SVE logove? Ova akcija se ne može poništiti!',
        'del_logs_error': 'Došlo je do greške prilikom brisanja logova.',
        # Dashboard
        'dash_refreshing': 'Osvežavanje...',
        'dash_next_refresh': 'Sledeće osvežavanje za',
        # Admin settings - system info
        'sysinfo_platform': 'Platforma:',
        'sysinfo_rpi': 'Raspberry Pi podrška:',
        'sysinfo_rpi_supported': 'Podržano (ARM/ARM64)',
        'sysinfo_python': 'Python verzija:',
        # SSH Help Modal
        'ssh_help_title': 'SSH Setup - Daljinsko Gašenje',
        'ssh_help_install_server': 'Instalacija OpenSSH Servera',
        'ssh_help_check_status': 'Provera Statusa',
        'ssh_help_should_see_running': 'Trebalo bi da vidite "active (running)".',
        'ssh_help_create_user': 'Kreiranje SSH Korisnika (Preporučeno)',
        'ssh_help_nopasswd_shutdown': 'Omogućavanje Shutdown Bez Lozinke',
        'ssh_help_add_to_end': 'Dodaj na kraj fajla:',
        'ssh_help_testing': 'Testiranje',
        'ssh_help_wol_entry': 'Unos u WOL Manager',
        'ssh_help_ip_example': 'IP adresa računara (npr. 192.168.1.100)',
        'ssh_help_user_password': 'lozinka korisnika',
        'ssh_help_open_ps_admin': 'Otvori PowerShell kao Administrator',
        'ssh_help_start_service': 'Pokretanje SSH Servisa',
        'ssh_help_firewall_rule': 'Firewall Pravilo',
        'ssh_help_ps_script': 'Kreiranje PowerShell Shutdown Skripta',
        'ssh_help_create_file': 'Kreiraj fajl',
        'ssh_help_ip_win': 'IP adresa računara',
        'ssh_help_win_username': 'Windows korisničko ime (Administrator preporučen)',
        'ssh_help_win_password': 'Windows lozinka',
        'ssh_help_win_admin_note': 'Windows zahteva Administrator privilegije za shutdown.',
        'ssh_help_security_title': 'Bezbednost',
        'ssh_help_sec_encrypted': 'Lozinke se čuvaju enkriptovano u bazi podataka (AES-256)',
        'ssh_help_sec_strong_pw': 'Preporučuje se korišćenje jakih lozinki',
        'ssh_help_sec_key_auth': 'Opcionalno: Možete koristiti SSH key umesto lozinke',
        'ssh_help_sec_limit_access': 'Ograničite SSH pristup samo na potrebne korisnike',
    },
    'en': {
        # Navigation
        'nav_dashboard': 'Dashboard',
        'nav_preferences': 'Computer Preferences',
        'nav_statistics': 'Statistics',
        'nav_admin': 'Admin',
        'nav_history': 'History',
        'nav_logout': 'Logout',
        # History page
        'history_title': 'Wake-on-LAN History',
        'search_label': 'Search',
        'search_placeholder': 'Computer name or user...',
        'date_from_label': 'From date',
        'date_to_label': 'To date',
        'btn_filter': 'Filter',
        'btn_reset': 'Reset',
        'col_computer': 'Computer',
        'col_user': 'User',
        'col_timestamp': 'Timestamp',
        'col_status': 'Status',
        'no_logs': 'No logs found',
        'no_filter_results': 'No results for this filter',
        'delete_logs': 'Delete Logs',
        'status_sent': 'Sent',
        'status_failed': 'Failed',
        # Settings
        'settings_lang_label': 'Application Language',
        'settings_lang_desc': 'Interface language for all users.',
        'settings_title': 'Application Settings',
        'settings_features_title': 'Features',
        'settings_features_desc': 'Enable or disable specific application features',
        'settings_groups_label': 'Computer groups',
        'settings_groups_desc': 'Enables organizing computers into groups for easier management. Recommended for larger networks.',
        'settings_search_label': 'Search',
        'settings_search_desc': 'Enables searching computers by name and MAC address. Less useful for small networks with few computers.',
        'settings_save_btn': 'Save settings',
        'settings_sysinfo_title': 'System Information',
        'back_label': 'Back',
        # Common status
        'status_online': 'Online',
        'status_offline': 'Offline',
        'status_unknown': 'Unknown',
        # Common buttons
        'btn_edit': 'Edit',
        'btn_delete': 'Delete',
        'btn_save': 'Save',
        'btn_cancel': 'Cancel',
        'btn_add': 'Add',
        'btn_help': 'Help',
        'btn_close': 'Close',
        'btn_wake': 'Wake',
        'btn_shutdown': 'Shutdown',
        'btn_terminal': 'Terminal',
        'col_actions': 'Actions',
        'col_name': 'Name',
        # Dashboard
        'dash_title': 'My Computers',
        'dash_search_ph': 'Search by name, IP address, MAC address...',
        'dash_check_status': 'Check status',
        'dash_checking': 'Checking...',
        'dash_wake_all': 'Wake all',
        'dash_ungrouped': 'My computers',
        'dash_no_results': 'No search results',
        'dash_no_computers': 'You have no assigned computers',
        'dash_no_computers_sub': 'Contact your administrator to get access to computers',
        'dash_opis': 'Description',
        'dash_last_wol': 'Last WoL',
        'dash_last_shutdown': 'Last shutdown',
        'dash_checked': 'Checked',
        'stat_total': 'Total',
        'sending': 'Sending...',
        'shutting_down': 'Shutting down...',
        # Dashboard JS
        'confirm_shutdown': 'Shutdown computer',
        'confirm_wake_group': 'Wake all computers in group',
        'wol_sent': 'WoL packet sent to',
        'shutdown_success': 'successfully shut down',
        'error_prefix': 'Error',
        'status_error': 'Error',
        # Admin Computers
        'page_admin_comp': 'Computer Management',
        'btn_add_computer': 'Add Computer',
        'btn_users_nav': 'Users',
        'btn_groups_nav': 'Groups',
        'btn_settings_nav': 'Settings',
        'col_mac': 'MAC Address',
        'col_ip': 'IP Address',
        'col_assigned_users': 'Assigned Users',
        'no_assigned_users': 'No assigned users',
        'more_users_suffix': 'more',
        'no_computers_msg': 'No computers in the system',
        'add_first_computer': 'Add First Computer',
        'confirm_delete_comp': 'Are you sure you want to delete the computer',
        'comp_deleted': 'was deleted',
        # Admin Users
        'page_admin_users': 'User Management',
        'btn_add_user_nav': 'Add User',
        'back_to_computers': 'Back to computers',
        'back_to_users': 'Back to users',
        'back_to_groups': 'Back to groups',
        'badge_admin_label': 'Admin',
        'badge_user_label': 'User',
        'col_username': 'Username',
        'col_email': 'Email',
        'col_role': 'Role',
        'col_joined': 'Joined',
        'groups_can_view': 'Can view groups',
        'groups_no_view': 'No groups',
        'btn_role_toggle': 'Role',
        'btn_change_role': 'Change Role',
        'your_account_label': 'Your account',
        'modal_edit_user_title': 'Edit User',
        'modal_save': 'Save',
        'all_fields_required': 'All fields are required',
        'confirm_del_user': 'Are you sure you want to delete the user',
        'confirm_toggle_admin': 'Are you sure you want to change admin status?',
        'confirm_toggle_groups': 'Are you sure you want to change the groups permission?',
        'no_users_found': 'No users found',
        # Admin Groups
        'page_admin_groups': 'Computer Groups',
        'btn_new_group': 'New Group',
        'no_comp_in_group': 'No assigned computers',
        'comp_count_suffix': 'computer(s)',
        'groups_empty_msg': 'No groups created',
        'groups_empty_hint': 'Create groups to organize computers',
        'delete_group_confirm': 'Are you sure you want to delete the group',
        'delete_group_note': 'Computers will not be deleted.',
        # Computer form
        'page_add_comp': 'Add New Computer',
        'page_edit_comp': 'Edit Computer',
        'comp_name_label': 'Computer Name',
        'comp_mac_label': 'MAC Address',
        'comp_mac_hint': 'Format: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF',
        'comp_ip_label': 'IP Address (optional)',
        'comp_desc_label': 'Description (optional)',
        'comp_os_label': 'Operating System',
        'comp_os_unknown': 'Unknown',
        'comp_os_hint': 'Important for SSH shutdown commands',
        'ssh_config_section': 'SSH Configuration (for shutdown)',
        'ssh_host_label': 'SSH Host',
        'ssh_host_hint': 'Leave empty if SSH uses the same address as the IP address',
        'ssh_port_label': 'SSH Port',
        'ssh_user_label': 'SSH Username',
        'ssh_pass_label': 'SSH Password',
        'ssh_pass_hint_empty': 'Leave empty if not using SSH',
        'ssh_pass_hint_set': 'Set new or leave empty',
        'ssh_already_has_pass': 'Password already set.',
        'ssh_keep_existing': 'Leave empty to keep existing.',
        'ssh_pass_encrypted': 'Password is stored encrypted.',
        'ssh_auto_login_label': 'SSH Auto-Login',
        'ssh_auto_on_desc': 'If enabled: uses SSH password for auto-login in terminal',
        'ssh_auto_off_desc': 'If disabled: user will need to enter password manually',
        'assign_users_label': 'Assign to Users',
        'no_users_in_system': 'No users in the system',
        'toggle_access_hint': 'Enable toggle for users you want to grant access to this computer.',
        'btn_save_changes': 'Save Changes',
        'role_viewer_opt': 'Viewer (view only)',
        'role_operator_opt': 'Operator (wake/shutdown)',
        'role_owner_opt': 'Owner (edit device/SSH)',
        # Group form
        'page_add_group': 'New Group',
        'page_edit_group': 'Edit Group',
        'group_name_label': 'Group name',
        'group_desc_label': 'Description',
        'group_color_label': 'Color',
        'group_icon_label': 'Icon',
        'allowed_actions_label': 'Allowed Actions',
        'actions_info_desc': 'Select which actions users can perform on computers in this group',
        'allow_wake_label': 'Wake computers (Wake-on-LAN)',
        'allow_wake_desc': 'Users can wake up computers in this group',
        'allow_shutdown_label': 'Shutdown computers (SSH Shutdown)',
        'allow_shutdown_desc': 'Users can shut down computers in this group (requires SSH)',
        'actions_warning': 'If no action is selected, users will not be able to control computers in the group.',
        'comp_in_group_label': 'Computers in group',
        'search_comp_ph': 'Search by name, IP or MAC address...',
        'no_ip_label': 'No IP',
        # Add user form
        'page_add_user': 'Add New User',
        'username_label': 'Username',
        'email_label': 'Email',
        'password_label': 'Password',
        'admin_priv_label': 'Admin privileges',
        'admin_priv_desc': 'Admin can add/delete users and computers',
        'btn_add_user_form': 'Add User',
        'note_section_title': 'Note',
        'note_unique_username': 'Username must be unique',
        'note_valid_email': 'Email must be valid and unique',
        'note_min_password': 'Password must have at least 6 characters',
        'note_admin_rights': 'Admin users can manage all system features',
        # Login
        'login_username': 'Username',
        'login_password': 'Password',
        'login_remember': 'Remember me',
        'login_btn': 'Login',
        'login_contact': 'Contact administrator for access',
        # Profile
        'profile_title': 'User Profile',
        'profile_edit_section': 'Edit Profile',
        'profile_change_pw': 'Change Password',
        'label_role': 'Role',
        'label_member_since': 'Member Since',
        'label_current_pw': 'Current Password',
        'label_new_pw': 'New Password',
        'label_confirm_pw': 'Confirm New Password',
        'btn_save_profile': 'Save Changes',
        'btn_update_pw': 'Update Password',
        'role_admin_label': 'Administrator',
        'role_user_label': 'Regular User',
        'pw_mismatch': 'Passwords do not match',
        'pw_min_length': 'Password must have at least 6 characters',
        # Statistics
        'stats_title': 'Statistics',
        'stats_24h': '24 hours',
        'stats_7d': '7 days',
        'stats_30d': '30 days',
        'stats_90d': '90 days',
        'stats_online_now': 'Currently online',
        'stats_wol_total': 'Total WoL',
        'stats_shutdowns_total': 'Total shutdowns',
        'stats_avg_uptime': 'Average uptime',
        'stats_status_chart': 'Computer status',
        'stats_activity_chart': 'Activity',
        'stats_loading': 'Loading statistics...',
        'stats_no_data': 'No data to display',
        'stats_error': 'Error loading statistics',
        'stats_uptime_label': 'Uptime',
        'stats_shutdowns_label': 'Shutdowns',
        'stats_day': 'day',
        'stats_days': 'days',
        # SSH notification in base.html
        'ssh_decrypt_fail_title': 'SSH password cannot be decrypted',
        'ssh_decrypt_fail_desc': 'The password was saved with an old key and cannot be used. Go to the computer settings and re-enter the SSH password.',
        'ssh_decrypt_fix_btn': 'Edit SSH password',
        # Missing keys - aliases and additions
        'actions_warning_title': 'Note',
        'actions_warning_body': 'If no action is selected, users will not be able to control computers in the group.',
        'btn_save_group': 'Save Group',
        'btn_save_settings': 'Save Settings',
        'comp_desc_ph': 'Brief computer description...',
        'comp_mac_format_hint': 'Format: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF',
        'comp_os_unknown_opt': 'Unknown',
        'group_desc_ph': 'Brief group description (optional)',
        'groups_feature_label': 'Computer Groups',
        'groups_feature_desc': 'Allows organizing computers into groups for easier management. Recommended for larger networks.',
        'search_feature_label': 'Search',
        'search_feature_desc': 'Enables searching computers by name and MAC address. Less useful for small networks.',
        'login_admin_contact': 'Contact administrator for access',
        'login_btn_label': 'Login',
        'login_user_label': 'Username',
        'login_user_ph': 'Enter username',
        'login_pass_label': 'Password',
        'login_pass_ph': 'Enter password',
        'login_remember_label': 'Remember me',
        'page_settings': 'Settings',
        'password_min_hint': 'Minimum 6 characters',
        'username_min_hint': 'Minimum 3 characters',
        'section_features': 'Features',
        'section_features_desc': 'Enable or disable specific application features',
        'section_system_info': 'System Information',
        'ssh_pass_stored_enc': 'Password is stored encrypted in the database',
        'ssh_set_new_or_keep': 'Password already set.',
        'stats_unknown': 'Unknown',
        'stats_timeline_label': 'Activity timeline',
        # Computer Preferences page
        'prefs_title': 'Computer Preferences',
        'prefs_no_computers': 'You have no assigned computers.',
        'prefs_ssh_save_error': 'Could not save SSH setting. Please try again.',
        'btn_edit_device': 'Edit device',
        'ssh_enabled': 'Enabled',
        'ssh_disabled': 'Disabled',
        'ssh_autologin_enabled_by_admin': 'SSH Auto-Login has been ENABLED by admin',
        'ssh_autologin_disabled_by_admin': 'SSH Auto-Login has been DISABLED by admin',
        'mac_no_change': 'MAC address cannot be changed',
        # Register page
        'register_title': 'Register',
        'register_heading': 'Create new account',
        'register_confirm_ph': 'Repeat password',
        'register_btn': 'Register',
        'register_have_account': 'Already have an account?',
        'register_login_link': 'Sign in here',
        # Base - SSH modal
        'ssh_modal_password_ph': 'Enter SSH password...',
        'ssh_modal_login_btn': 'Login',
        'ssh_password_required': 'SSH password is required',
        # Base - role change toasts
        'access_removed_toast': 'Admin has removed your access to a computer',
        'access_granted_toast': 'You have been granted access to a new computer',
        # History - delete modal
        'del_logs_title': 'Delete Logs',
        'del_logs_range': 'Delete logs for period',
        'del_logs_all': 'Delete ALL logs',
        'del_logs_dates_required': 'Please enter both dates for the period.',
        'del_logs_confirm_range': 'Are you sure you want to delete logs from',
        'del_logs_confirm_all': 'Are you sure you want to delete ALL logs? This action cannot be undone!',
        'del_logs_error': 'An error occurred while deleting logs.',
        # Dashboard
        'dash_refreshing': 'Refreshing...',
        'dash_next_refresh': 'Next refresh in',
        # Admin settings - system info
        'sysinfo_platform': 'Platform:',
        'sysinfo_rpi': 'Raspberry Pi support:',
        'sysinfo_rpi_supported': 'Supported (ARM/ARM64)',
        'sysinfo_python': 'Python version:',
        # SSH Help Modal
        'ssh_help_title': 'SSH Setup - Remote Shutdown',
        'ssh_help_install_server': 'Install OpenSSH Server',
        'ssh_help_check_status': 'Check Status',
        'ssh_help_should_see_running': 'You should see "active (running)".',
        'ssh_help_create_user': 'Create SSH User (Recommended)',
        'ssh_help_nopasswd_shutdown': 'Enable Shutdown Without Password',
        'ssh_help_add_to_end': 'Add to end of file:',
        'ssh_help_testing': 'Testing',
        'ssh_help_wol_entry': 'WOL Manager entry',
        'ssh_help_ip_example': 'Computer IP address (e.g. 192.168.1.100)',
        'ssh_help_user_password': 'user password',
        'ssh_help_open_ps_admin': 'Open PowerShell as Administrator',
        'ssh_help_start_service': 'Start SSH Service',
        'ssh_help_firewall_rule': 'Firewall Rule',
        'ssh_help_ps_script': 'Create PowerShell Shutdown Script',
        'ssh_help_create_file': 'Create file',
        'ssh_help_ip_win': 'Computer IP address',
        'ssh_help_win_username': 'Windows username (Administrator recommended)',
        'ssh_help_win_password': 'Windows password',
        'ssh_help_win_admin_note': 'Windows requires Administrator privileges for shutdown.',
        'ssh_help_security_title': 'Security',
        'ssh_help_sec_encrypted': 'Passwords are stored encrypted in the database (AES-256)',
        'ssh_help_sec_strong_pw': 'Use strong passwords',
        'ssh_help_sec_key_auth': 'Optional: You can use SSH keys instead of passwords',
        'ssh_help_sec_limit_access': 'Limit SSH access to only necessary users',
    }
}

@app.context_processor
def inject_language():
    """Inject translation function into all templates"""
    try:
        lang = AppSettings.get('app_language', 'sr') or 'sr'
    except Exception:
        lang = 'sr'
    tr = TRANSLATIONS.get(lang, TRANSLATIONS['sr'])
    def t(key, fallback=None):
        return tr.get(key, fallback if fallback is not None else key)
    return dict(lang=lang, t=t)

# Verify encryption setup on startup
_security_verified = False

@app.before_request
def verify_security():
    """Verify security configuration on first request"""
    global _security_verified
    if not _security_verified:
        if not verify_encryption_setup():
            logger.error("âš ï¸  ENCRYPTION NOT PROPERLY CONFIGURED! Set ENCRYPTION_KEY in environment.")
        else:
            logger.info("âœ“ Encryption verified and working correctly")
        _security_verified = True

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def _get_user_role(user, computer):
    if user.is_admin:
        return 'owner'
    pref = UserComputerPreference.query.filter_by(
        user_id=user.id,
        computer_id=computer.id
    ).first()
    if pref and pref.role:
        return pref.role
    if computer.created_by_id == user.id:
        return 'owner'
    return 'operator'

def _can_operate(user, computer):
    role = _get_user_role(user, computer)
    return role in ('owner', 'operator', 'editor')

# ==================== ROUTES ====================

@app.route('/manifest.json')
def manifest():
    """PWA Web App Manifest"""
    from flask import jsonify, make_response
    data = {
        "name": "WOL Manager",
        "short_name": "WOL",
        "description": "Wake-on-LAN upravljanje računarima",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0066cc",
        "theme_color": "#0066cc",
        "icons": [
            {"src": "/images/imi_logo.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/images/imi_logo.png", "sizes": "512x512", "type": "image/png"}
        ]
    }
    response = make_response(jsonify(data))
    response.headers['Content-Type'] = 'application/manifest+json'
    return response

@app.route('/')
def index():
    """Home page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('auth.login'))

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
    """User dashboard - shows only assigned computers"""
    # Get computers assigned to current user
    computers = current_user.computers
    
    # Get app settings
    enable_groups = AppSettings.get_bool('enable_groups', default=True)
    enable_search = AppSettings.get_bool('enable_search', default=True)
    
    # Check if user can view groups (admin always can, users only if enabled)
    show_groups = enable_groups and (current_user.is_admin or current_user.can_view_groups)
    
    if request.method == 'POST':
        # Check if it's AJAX request for WOL
        if request.is_json:
            data = request.get_json()
            computer_id = data.get('computer_id')
            
            computer = Computer.query.get(computer_id)
            
            # Check if user has access to this computer
            if not computer or current_user not in computer.assigned_users:
                return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403

            if not _can_operate(current_user, computer):
                return jsonify({'success': False, 'message': 'Nemate dozvolu za ovu akciju'}), 403
            
            # Send WOL packet
            success, message = send_wol_packet(computer.mac_address, ip_address=computer.ip_address)
            
            # Log the action
            log = WOLLog(
                user_id=current_user.id,
                computer_id=computer_id,
                status='sent' if success else 'failed'
            )
            db.session.add(log)
            computer.last_wol = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': success, 
                'message': message,
                'last_wol': computer.last_wol.strftime('%Y-%m-%d %H:%M') if computer.last_wol else None
            })
    
    groups = ComputerGroup.query.order_by(ComputerGroup.name).all() if show_groups else []

    # Per-user roles
    user_roles = {}
    if computers:
        comp_ids = [c.id for c in computers]
        prefs = UserComputerPreference.query.filter(
            UserComputerPreference.user_id == current_user.id,
            UserComputerPreference.computer_id.in_(comp_ids)
        ).all()
        user_roles = {p.computer_id: (p.role or 'operator') for p in prefs}

    return render_template('dashboard.html', 
                         computers=computers, 
                         groups=groups,
                         enable_groups=show_groups,
                         enable_search=enable_search,
                         user_roles=user_roles)

@app.route('/api/shutdown', methods=['POST'])
@login_required
@limiter.limit("10 per minute")  # Rate limit: max 10 shutdown attempts per minute
def shutdown_computer():
    """Shutdown a computer via SSH - Only admin has SSH credentials"""
    if request.is_json:
        data = request.get_json()
        computer_id = data.get('computer_id')
        
        computer = Computer.query.get(computer_id)
        
        # Check if user has access to this computer
        # Regular users can trigger shutdown, but only if admin configured SSH
        if not computer or current_user not in computer.assigned_users:
            # Audit log: Unauthorized shutdown attempt
            AuditLog.log_action(
                action='shutdown_denied',
                user=current_user,
                resource_type='computer',
                resource_id=computer_id,
                status='denied',
                details=f'User attempted to shutdown computer without access',
                ip_address=get_real_ip(),
                user_agent=request.headers.get('User-Agent')
            )
            return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
        
        if not _can_operate(current_user, computer):
            return jsonify({'success': False, 'message': 'Nemate dozvolu za ovu akciju'}), 403

        # Check if SSH is configured
        if not computer.ssh_username or not computer.ssh_password:
            return jsonify({
                'success': False, 
                'message': 'SSH nije konfigurisan za ovaj računar. Kontaktirajte administratora.'
            }), 400
        
        # BUG 2 fix: fall back to ip_address when ssh_host is empty
        ssh_host = computer.ssh_host if computer.ssh_host and computer.ssh_host.strip() else computer.ip_address
        
        # Send shutdown command via SSH
        success, message = shutdown_computer_ssh(
            host=ssh_host,
            username=computer.ssh_username,
            password=computer.ssh_password,
            port=computer.ssh_port or 22,
            os_type=computer.os_type or 'linux'  # Use computer's OS type
        )
        
        # Audit log: Shutdown action
        AuditLog.log_action(
            action='shutdown',
            user=current_user,
            resource_type='computer',
            resource_id=computer_id,
            status='success' if success else 'failed',
            details=f'Computer: {computer.name}, Result: {message}',
            ip_address=get_real_ip(),
            user_agent=request.headers.get('User-Agent')
        )
        
        # Log the action
        log = ShutdownLog(
            user_id=current_user.id,
            computer_id=computer_id,
            status='success' if success else 'failed',
            error_message=None if success else message
        )
        db.session.add(log)
        
        if success:
            computer.last_shutdown = datetime.utcnow()
            computer.status = 'offline'  # Assume offline after shutdown
        
        db.session.commit()
        
        # Emit status update via WebSocket
        if success:
            socketio.emit('status_update', {
                'computer_id': computer.id,
                'status': 'offline',
                'last_checked': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            }, namespace='/')
        
        return jsonify({
            'success': success, 
            'message': message,
            'last_shutdown': computer.last_shutdown.strftime('%Y-%m-%d %H:%M') if computer.last_shutdown else None
        })
    
    return jsonify({'success': False, 'message': 'Invalid request'}), 400

@app.route('/admin/computers')
@login_required
def admin_computers():
    """Admin: Manage computers"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    computers = Computer.query.all()
    return render_template('admin_computers.html', computers=computers)

@app.route('/admin/computers/add', methods=['GET', 'POST'])
@login_required
def admin_add_computer():
    """Admin: Add new computer"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        mac_address = request.form.get('mac_address', '').strip().upper()
        ip_address = request.form.get('ip_address', '').strip()
        description = request.form.get('description', '').strip()
        assigned_user_ids = request.form.getlist('assigned_users')
        
        # Validation
        if not name or not mac_address:
            flash('Naziv i MAC adresa su obavezni', 'error')
            return redirect(url_for('admin_add_computer'))
        
        if not validate_mac_address(mac_address):
            flash('Nevažeći format MAC adrese', 'error')
            return redirect(url_for('admin_add_computer'))
        
        if Computer.query.filter_by(mac_address=mac_address).first():
            flash('MAC adresa je već registrovana', 'error')
            return redirect(url_for('admin_add_computer'))
        
        # Create new computer
        computer = Computer(
            name=name,
            mac_address=mac_address,
            ip_address=ip_address if ip_address else None,
            description=description if description else None,
            os_type=request.form.get('os_type', 'linux'),
            ssh_host=request.form.get('ssh_host', '').strip() or None,
            ssh_port=int(request.form.get('ssh_port', 22)),
            ssh_username=request.form.get('ssh_username', '').strip() or None,
            ssh_password=request.form.get('ssh_password', '').strip() or None,
            ssh_auto_login=request.form.get('ssh_auto_login') == 'on',  # Per-computer SSH auto-login
            created_by_id=None
        )
        
        # Assign users and roles
        db.session.add(computer)
        db.session.flush()
        owner_ids = []
        for user_id in assigned_user_ids:
            user = User.query.get(int(user_id))
            if user:
                computer.assigned_users.append(user)
                role = request.form.get(f'role_{user_id}', 'operator')
                if role == 'owner':
                    owner_ids.append(user.id)
                pref = UserComputerPreference(
                    user_id=user.id,
                    computer_id=computer.id,
                    role=role,
                    ssh_auto_login=False
                )
                db.session.add(pref)

        if len(owner_ids) >= 1:
            computer.created_by_id = owner_ids[0]
        
        db.session.commit()
        
        # Emit role assignments via WebSocket for live updates
        for user_id in assigned_user_ids:
            role = request.form.get(f'role_{user_id}', 'operator')
            socketio.emit('computer_role_changed', {
                'computer_id': computer.id,
                'user_id': int(user_id),
                'role': role,
                'has_access': True
            }, namespace='/')
        
        # Audit log: Computer created
        AuditLog.log_action(
            action='computer_create',
            user=current_user,
            resource_type='computer',
            resource_id=computer.id,
            status='success',
            details=f'Created computer "{name}" (MAC: {mac_address}, owner_id: {computer.created_by_id})',
            ip_address=get_real_ip(),
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Računar "{name}" je uspešno dodat', 'success')
        return redirect(url_for('admin_computers'))
    
    users = User.query.all()
    return render_template('admin_add_computer.html', users=users)

@app.route('/admin/computers/<int:computer_id>/edit', methods=['GET', 'POST'])
@login_required
def admin_edit_computer(computer_id):
    """Admin: Edit computer"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    computer = Computer.query.get_or_404(computer_id)
    
    if request.method == 'POST':
        computer.name = request.form.get('name', '').strip()
        mac_address = request.form.get('mac_address', '').strip().upper()
        computer.ip_address = request.form.get('ip_address', '').strip() or None
        computer.description = request.form.get('description', '').strip() or None
        computer.os_type = request.form.get('os_type', 'linux')
        assigned_user_ids = request.form.getlist('assigned_users')
        
        # SSH configuration
        computer.ssh_host = request.form.get('ssh_host', '').strip() or None
        computer.ssh_port = int(request.form.get('ssh_port', 22))
        computer.ssh_username = request.form.get('ssh_username', '').strip() or None
        computer.ssh_auto_login = request.form.get('ssh_auto_login') == 'on'
        
        # Only update password if new one is provided (security: never expose existing password)
        new_password = request.form.get('ssh_password', '').strip()
        if new_password:  # Only update if not empty
            computer.ssh_password = new_password
        
        # Validation
        if not computer.name or not mac_address:
            flash('Naziv i MAC adresa su obavezni', 'error')
            return redirect(url_for('admin_edit_computer', computer_id=computer_id))
        
        if not validate_mac_address(mac_address):
            flash('Nevažeći format MAC adrese', 'error')
            return redirect(url_for('admin_edit_computer', computer_id=computer_id))
        
        # Check if MAC address is taken by another computer
        existing = Computer.query.filter_by(mac_address=mac_address).first()
        if existing and existing.id != computer.id:
            flash('MAC adresa je već registrovana', 'error')
            return redirect(url_for('admin_edit_computer', computer_id=computer_id))
        
        computer.mac_address = mac_address
        
        # Update assigned users and roles
        computer.assigned_users = []
        assigned_ids_int = set()
        owner_ids = []
        for user_id in assigned_user_ids:
            uid = int(user_id)
            assigned_ids_int.add(uid)
            user = User.query.get(uid)
            if user:
                computer.assigned_users.append(user)

        existing_prefs = UserComputerPreference.query.filter_by(computer_id=computer.id).all()
        prefs_by_user = {p.user_id: p for p in existing_prefs}

        for uid in assigned_ids_int:
            role = request.form.get(f'role_{uid}', 'operator')
            if role == 'owner':
                owner_ids.append(uid)
            pref = prefs_by_user.get(uid)
            if pref:
                pref.role = role
            else:
                db.session.add(UserComputerPreference(
                    user_id=uid,
                    computer_id=computer.id,
                    role=role,
                    ssh_auto_login=False
                ))

        computer.created_by_id = owner_ids[0] if owner_ids else None

        # Remove prefs for users no longer assigned
        for uid, pref in prefs_by_user.items():
            if uid not in assigned_ids_int:
                db.session.delete(pref)
        
        db.session.commit()
        
        # Emit role changes via WebSocket for live updates
        for uid in assigned_ids_int:
            role = request.form.get(f'role_{uid}', 'operator')
            socketio.emit('computer_role_changed', {
                'computer_id': computer.id,
                'user_id': uid,
                'role': role,
                'has_access': True
            }, namespace='/')
        
        # Notify users who lost access
        for uid, pref in prefs_by_user.items():
            if uid not in assigned_ids_int:
                socketio.emit('computer_role_changed', {
                    'computer_id': computer.id,
                    'user_id': uid,
                    'role': None,
                    'has_access': False
                }, namespace='/')
        
        # Emit SSH auto-login change via WebSocket for live updates
        socketio.emit('ssh_auto_login_changed', {
            'computer_id': computer.id,
            'ssh_auto_login': computer.ssh_auto_login,
            'user_id': current_user.id
        }, namespace='/')
        
        # Audit log: Computer updated
        AuditLog.log_action(
            action='computer_update',
            user=current_user,
            resource_type='computer',
            resource_id=computer.id,
            status='success',
            details=f'Updated computer "{computer.name}" (MAC: {mac_address})',
            ip_address=get_real_ip(),
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Računar "{computer.name}" je ažuriran', 'success')
        return redirect(url_for('admin_computers'))
    
    # Security: Check if password exists without exposing it
    has_ssh_password = computer._ssh_password_encrypted is not None and computer._ssh_password_encrypted != ''
    
    users = User.query.all()
    # Build role map for template
    prefs = UserComputerPreference.query.filter_by(computer_id=computer.id).all()
    user_roles = {p.user_id: (p.role or 'operator') for p in prefs}

    return render_template('admin_edit_computer.html', computer=computer, users=users, has_ssh_password=has_ssh_password, user_roles=user_roles)

@app.route('/admin/computers/<int:computer_id>/delete', methods=['POST'])
@login_required
def admin_delete_computer(computer_id):
    """Admin: Delete computer"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    computer = Computer.query.get_or_404(computer_id)
    
    name = computer.name
    db.session.delete(computer)
    db.session.commit()
    
    # Audit log: Computer deleted
    AuditLog.log_action(
        action='computer_delete',
        user=current_user,
        resource_type='computer',
        resource_id=computer_id,
        status='success',
        details=f'Deleted computer "{name}"',
        ip_address=get_real_ip(),
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({'success': True, 'message': f'Računar "{name}" je obrisan'})

@app.route('/admin/users')
@login_required
def admin_users():
    """Admin: Manage users"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    users = User.query.all()
    return render_template('admin_users.html', users=users)

@app.route('/admin/users/add', methods=['GET', 'POST'])
@login_required
def admin_add_user():
    """Admin: Add new user"""
    # SECURITY: Validate admin status from database to prevent session manipulation
    if not validate_admin_status(current_user.id):
        logger.warning(f"Unauthorized user creation attempt by user {current_user.id}")
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        is_admin = request.form.get('is_admin') is not None
        
        # Validation
        if not username or not email or not password:
            flash('Sva polja su obavezna', 'error')
            return redirect(url_for('admin_add_user'))
        
        if len(username) < 3:
            flash('Korisničko ime mora imati najmanje 3 karaktera', 'error')
            return redirect(url_for('admin_add_user'))
        
        if len(password) < 6:
            flash('Lozinka mora imati najmanje 6 karaktera', 'error')
            return redirect(url_for('admin_add_user'))
        
        if User.query.filter_by(username=username).first():
            flash('Korisničko ime već postoji', 'error')
            return redirect(url_for('admin_add_user'))
        
        if User.query.filter_by(email=email).first():
            flash('Email već postoji', 'error')
            return redirect(url_for('admin_add_user'))
        
        # Create new user
        user = User(username=username, email=email, is_admin=is_admin)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Audit log: User created
        AuditLog.log_action(
            action='user_create',
            user=current_user,
            resource_type='user',
            resource_id=user.id,
            status='success',
            details=f'Created user "{username}" (admin: {is_admin})',
            ip_address=get_real_ip(),
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Korisnik "{username}" je uspešno kreiran', 'success')
        return redirect(url_for('admin_users'))
    
    return render_template('admin_add_user.html')

@app.route('/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
@login_required
def toggle_admin(user_id):
    """Admin: Toggle user admin status"""
    # SECURITY: Validate admin status from database to prevent session manipulation
    if not validate_admin_status(current_user.id):
        logger.warning(f"Unauthorized admin toggle attempt by user {current_user.id}")
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    user = User.query.get_or_404(user_id)
    
    # Prevent removing own admin status
    if user.id == current_user.id:
        return jsonify({'success': False, 'message': 'Ne možete oduzeti svoju admin dozvolu'}), 400
    
    user.is_admin = not user.is_admin
    db.session.commit()
    
    # Audit log: Admin permission changed
    AuditLog.log_action(
        action='user_admin_toggle',
        user=current_user,
        resource_type='user',
        resource_id=user.id,
        status='success',
        details=f'Changed {user.username} admin status to {user.is_admin}',
        ip_address=get_real_ip(),
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({
        'success': True,
        'message': f'Korisnik {user.username} je sada {"admin" if user.is_admin else "obični korisnik"}',
        'is_admin': user.is_admin
    })
# Audit log: Group permission changed
    AuditLog.log_action(
        action='user_groups_toggle',
        user=current_user,
        resource_type='user',
        resource_id=user.id,
        status='success',
        details=f'Changed {user.username} group viewing to {user.can_view_groups}',
        ip_address=get_real_ip(),
        user_agent=request.headers.get('User-Agent')
    )
    
    
@app.route('/admin/users/<int:user_id>/toggle-groups', methods=['POST'])
@login_required
def toggle_user_groups(user_id):
    """Admin: Toggle user group viewing permission"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    user = User.query.get_or_404(user_id)
    user.can_view_groups = not user.can_view_groups
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Korisnik {user.username} {"može" if user.can_view_groups else "ne može"} videti grupe',
        'can_view_groups': user.can_view_groups
    })

@app.route('/admin/users/<int:user_id>/delete', methods=['POST'])
@login_required
def delete_user(user_id):
    """Admin: Delete user"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    user = User.query.get_or_404(user_id)
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        return jsonify({'success': False, 'message': 'Ne možete obrisati svoje konto'}), 400
    
    username = user.username
    db.session.delete(user)
    db.session.commit()
    
    # Audit log: User deleted
    AuditLog.log_action(
        action='user_delete',
        user=current_user,
        resource_type='user',
        resource_id=user_id,
        status='success',
        details=f'Deleted user "{username}"',
        ip_address=get_real_ip(),
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({'success': True, 'message': f'Korisnik {username} je obrisan'})

@app.route('/admin/users/<int:user_id>/edit', methods=['POST'])
@login_required
def admin_edit_user(user_id):
    """Admin: Edit user username and email"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    
    new_username = data.get('username', '').strip()
    new_email = data.get('email', '').strip()
    
    if not new_username or not new_email:
        return jsonify({'success': False, 'message': 'Korisničko ime i email su obavezni'}), 400
    
    if len(new_username) < 3:
        return jsonify({'success': False, 'message': 'Korisničko ime mora imati najmanje 3 karaktera'}), 400
    
    # Check uniqueness
    existing_user = User.query.filter(User.username == new_username, User.id != user.id).first()
    if existing_user:
        return jsonify({'success': False, 'message': 'Korisničko ime već postoji'}), 400
    
    existing_email = User.query.filter(User.email == new_email, User.id != user.id).first()
    if existing_email:
        return jsonify({'success': False, 'message': 'Email već postoji'}), 400
    
    old_username = user.username
    user.username = new_username
    user.email = new_email
    db.session.commit()
    
    AuditLog.log_action(
        action='user_update',
        user=current_user,
        resource_type='user',
        resource_id=user.id,
        status='success',
        details=f'Updated user "{old_username}" -> "{new_username}", email: {new_email}',
        ip_address=get_real_ip(),
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({
        'success': True,
        'message': f'Korisnik je ažuriran',
        'username': user.username,
        'email': user.email
    })

@app.route('/history')
@login_required
def history():
    """View WOL/Shutdown history AND audit logs with search and filtering"""
    # Get search parameters
    search_query = request.args.get('search', '').strip()
    date_from = request.args.get('date_from', '').strip()
    date_to = request.args.get('date_to', '').strip()
    log_type = request.args.get('type', 'wol').strip()  # 'wol', 'shutdown', or 'audit'
    
    if log_type == 'audit':
        # Audit logs
        if current_user.is_admin:
            # Admin sees all audit logs
            logs_query = AuditLog.query
        else:
            # Regular users see only their own audit logs
            logs_query = AuditLog.query.filter_by(user_id=current_user.id)
        
        # Apply search filter for audit logs
        if search_query:
            logs_query = logs_query.filter(
                db.or_(
                    AuditLog.action.ilike(f'%{search_query}%'),
                    AuditLog.username.ilike(f'%{search_query}%'),
                    AuditLog.details.ilike(f'%{search_query}%')
                )
            )
        
        # Apply date filters
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                logs_query = logs_query.filter(AuditLog.timestamp >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                to_date = to_date.replace(hour=23, minute=59, second=59)
                logs_query = logs_query.filter(AuditLog.timestamp <= to_date)
            except ValueError:
                pass
        
        logs = logs_query.order_by(AuditLog.timestamp.desc()).all()
        return render_template('history.html', logs=logs, log_type='audit',
                             search_query=search_query, date_from=date_from, date_to=date_to)
    
    elif log_type == 'shutdown':
        # Shutdown logs
        if current_user.is_admin:
            logs_query = ShutdownLog.query
        else:
            logs_query = ShutdownLog.query.filter_by(user_id=current_user.id)
        
        # Apply search filter
        if search_query:
            logs_query = logs_query.join(Computer).join(User).filter(
                db.or_(
                    Computer.name.ilike(f'%{search_query}%'),
                    User.username.ilike(f'%{search_query}%')
                )
            )
        
        # Apply date filters
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                logs_query = logs_query.filter(ShutdownLog.timestamp >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                to_date = to_date.replace(hour=23, minute=59, second=59)
                logs_query = logs_query.filter(ShutdownLog.timestamp <= to_date)
            except ValueError:
                pass
        
        logs = logs_query.order_by(ShutdownLog.timestamp.desc()).all()
        return render_template('history.html', logs=logs, log_type='shutdown',
                             search_query=search_query, date_from=date_from, date_to=date_to)
    
    else:
        # WOL logs (default)
        if current_user.is_admin:
            # Admin sees all logs
            logs_query = WOLLog.query
        else:
            # Regular users see only their own logs
            logs_query = WOLLog.query.filter_by(user_id=current_user.id)
    
    # Apply search filter
    if search_query:
        logs_query = logs_query.join(Computer).join(User).filter(
            db.or_(
                Computer.name.ilike(f'%{search_query}%'),
                User.username.ilike(f'%{search_query}%')
            )
        )
    
    # Apply date filters
    if date_from:
        try:
            from_date = datetime.strptime(date_from, '%Y-%m-%d')
            logs_query = logs_query.filter(WOLLog.timestamp >= from_date)
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.strptime(date_to, '%Y-%m-%d')
            # Add one day to include the entire end date
            to_date = to_date.replace(hour=23, minute=59, second=59)
            logs_query = logs_query.filter(WOLLog.timestamp <= to_date)
        except ValueError:
            pass
    
    logs = logs_query.order_by(WOLLog.timestamp.desc()).all()
    
    return render_template('history.html', logs=logs, log_type='wol',
                         search_query=search_query, 
                         date_from=date_from, 
                         date_to=date_to)

@app.route('/profile')
@login_required
def profile():
    """User profile"""
    return render_template('profile.html', user=current_user)

@app.route('/computers/preferences')
@login_required
def computer_preferences():
    """Per-user computer preferences (SSH auto-login)"""
    if current_user.is_admin:
        flash('Admin koristi admin panel za podesavanja.', 'info')
        return redirect(url_for('admin_computers'))
    
    computers = current_user.computers

    # Get user roles for each computer
    user_roles = {}
    if computers:
        comp_ids = [c.id for c in computers]
        prefs = UserComputerPreference.query.filter(
            UserComputerPreference.user_id == current_user.id,
            UserComputerPreference.computer_id.in_(comp_ids)
        ).all()
        user_roles = {p.computer_id: (p.role or 'operator') for p in prefs}

    return render_template('computer_preferences.html', computers=computers, user_roles=user_roles)

@app.route('/computers/<int:computer_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_computer(computer_id):
    """Owner/Admin: edit computer and SSH credentials"""
    computer = Computer.query.get_or_404(computer_id)

    # Permission: admin or owner only
    user_role = _get_user_role(current_user, computer)
    if not current_user.is_admin and user_role != 'owner':
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        computer.name = request.form.get('name', '').strip()
        computer.ip_address = request.form.get('ip_address', '').strip() or None
        computer.description = request.form.get('description', '').strip() or None
        computer.os_type = request.form.get('os_type', 'linux')

        computer.ssh_host = request.form.get('ssh_host', '').strip() or None
        computer.ssh_port = int(request.form.get('ssh_port', 22))
        computer.ssh_username = request.form.get('ssh_username', '').strip() or None
        # ssh_auto_login is managed via /computers/preferences (not this form)

        new_password = request.form.get('ssh_password', '').strip()
        if new_password:
            computer.ssh_password = new_password

        if not computer.name:
            flash('Naziv racunara je obavezan', 'error')
            return redirect(url_for('edit_computer', computer_id=computer_id))

        db.session.commit()

        AuditLog.log_action(
            action='computer_update',
            user=current_user,
            resource_type='computer',
            resource_id=computer.id,
            status='success',
            details=f'User updated computer "{computer.name}"',
            ip_address=get_real_ip(),
            user_agent=request.headers.get('User-Agent')
        )

        flash('Racunar je azuriran', 'success')
        return redirect(url_for('computer_preferences'))

    return render_template('edit_computer.html', computer=computer)

@app.route('/profile/change-password', methods=['POST'])
@login_required
def change_password():
    """Change password"""
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'success': False, 'message': 'Sva polja su obavezna'}), 400
    
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'Lozinka mora imati najmanje 6 karaktera'}), 400
    
    if not current_user.check_password(old_password):
        return jsonify({'success': False, 'message': 'Trenutna lozinka je pogrešna'}), 400
    
    current_user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Lozinka je promenjena uspešno'})

@app.route('/profile/update', methods=['POST'])
@login_required
def update_profile():
    """Update own username and email"""
    data = request.get_json() or {}
    new_username = data.get('username', '').strip()
    new_email = data.get('email', '').strip()
    
    # SECURITY: Block any attempt to modify is_admin or privileged fields
    if 'is_admin' in data or 'can_view_groups' in data:
        logger.warning(f"Privilege escalation attempt by user {current_user.id} ({current_user.username})")
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    if not new_username or not new_email:
        return jsonify({'success': False, 'message': 'Sva polja su obavezna'}), 400
    
    if len(new_username) < 3:
        return jsonify({'success': False, 'message': 'Korisničko ime mora imati najmanje 3 karaktera'}), 400
    
    # Check uniqueness
    existing_user = User.query.filter(User.username == new_username, User.id != current_user.id).first()
    if existing_user:
        return jsonify({'success': False, 'message': 'Korisničko ime već postoji'}), 400
    
    existing_email = User.query.filter(User.email == new_email, User.id != current_user.id).first()
    if existing_email:
        return jsonify({'success': False, 'message': 'Email već postoji'}), 400
    
    current_user.username = new_username
    current_user.email = new_email
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Profil je ažuriran uspešno'})

@app.route('/api/computers/<int:computer_id>', methods=['GET'])
@login_required
def get_computer(computer_id):
    """Get single computer data with has_ssh flag"""
    computer = Computer.query.get_or_404(computer_id)
    
    if not current_user.is_admin and current_user not in computer.assigned_users:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    has_ssh = bool(computer.ssh_username and computer._ssh_password_encrypted)
    
    return jsonify({
        'success': True,
        'computer': {
            'id': computer.id,
            'name': computer.name,
            'mac_address': computer.mac_address,
            'ip_address': computer.ip_address,
            'description': computer.description,
            'status': computer.status or 'unknown',
            'os_type': computer.os_type or 'unknown',
            'has_ssh': has_ssh,
            'last_wol': computer.last_wol.strftime('%d.%m.%Y %H:%M') if computer.last_wol else None,
            'last_shutdown': computer.last_shutdown.strftime('%d.%m.%Y %H:%M') if computer.last_shutdown else None,
            'last_checked': computer.last_checked.strftime('%d.%m.%Y %H:%M:%S') if computer.last_checked else None,
        }
    })

@app.route('/api/computers/<int:computer_id>/ssh-preference', methods=['POST'])
@login_required
def set_computer_ssh_preference(computer_id):
    """Set global SSH auto-login preference for a computer (admin or owner only)"""
    computer = Computer.query.get_or_404(computer_id)

    # Only admin or owner can change SSH auto-login
    user_role = _get_user_role(current_user, computer)
    if not current_user.is_admin and user_role != 'owner':
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403

    data = request.get_json() or {}
    raw_value = data.get('ssh_auto_login')
    if isinstance(raw_value, bool):
        ssh_auto_login = raw_value
    else:
        ssh_auto_login = str(raw_value).lower() in ('true', '1', 'yes', 'on')

    computer.ssh_auto_login = ssh_auto_login

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving SSH preference: {e}")
        return jsonify({'success': False, 'message': 'Greska pri čuvanju podesavanja'}), 500

    # Emit SSH auto-login change via WebSocket for live updates
    try:
        socketio.emit('ssh_auto_login_changed', {
            'computer_id': computer_id,
            'user_id': current_user.id,
            'ssh_auto_login': ssh_auto_login
        }, namespace='/')
    except Exception as e:
        logger.error(f"Error emitting socket: {e}")
        # Don't fail the request if socket.io emit fails

    return jsonify({'success': True, 'ssh_auto_login': ssh_auto_login})

@app.route('/api/user/has-computers', methods=['GET'])
@login_required
def user_has_computers():
    """Check if current user has any assigned computers"""
    has_computers = len(current_user.computers) > 0
    return jsonify({'has_computers': has_computers})

@app.route('/api/computer/<int:computer_id>/status', methods=['GET'])
@login_required
def check_computer_status(computer_id):
    """Check computer status via ping"""
    computer = Computer.query.get_or_404(computer_id)
    
    # Check if user has access to this computer
    if not current_user.is_admin and current_user not in computer.assigned_users:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    # Check status
    is_online, status = check_host_status(computer.ip_address)
    
    # Auto-detect OS if computer is online
    if is_online and computer.ip_address:
        from wol import detect_os_type
        detected_os = detect_os_type(computer.ip_address)
        if detected_os != 'unknown':
            computer.os_type = detected_os
    
    # Update database
    computer.status = status
    computer.last_checked = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'status': status,
        'is_online': is_online,
        'last_checked': computer.last_checked.isoformat() if computer.last_checked else None
    })

@app.route('/api/computers/status', methods=['GET'])
@login_required
def check_all_computers_status():
    """Check status for all assigned computers in PARALLEL"""
    from concurrent.futures import ThreadPoolExecutor
    from wol import detect_os_type
    
    # Get computers assigned to current user
    computers = current_user.computers if not current_user.is_admin else Computer.query.all()
    
    def check_single_computer(computer):
        """Check single computer status (will run in parallel)"""
        if not computer.ip_address:
            return None
        
        is_online, status = check_host_status(computer.ip_address)
        
        # Auto-detect OS if computer is online
        if is_online:
            detected_os = detect_os_type(computer.ip_address)
            if detected_os != 'unknown':
                computer.os_type = detected_os
        
        # Log uptime change if status changed
        old_status = computer.status
        if old_status != status and status in ('online', 'offline'):
            try:
                uptime_entry = UptimeLog(computer_id=computer.id, status=status)
                db.session.add(uptime_entry)
            except Exception:
                pass
        
        computer.status = status
        computer.last_checked = datetime.utcnow()
        
        has_ssh = bool(computer.ssh_username and computer._ssh_password_encrypted)
        
        return {
            'id': computer.id,
            'name': computer.name,
            'status': status,
            'is_online': is_online,
            'has_ssh': has_ssh,
            'last_checked': computer.last_checked.isoformat()
        }
    
    # PARALLEL CHECK - all computers at once!
    results = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all checks at once
        future_to_computer = {executor.submit(check_single_computer, comp): comp for comp in computers}
        
        # Collect results as they complete
        for future in future_to_computer:
            result = future.result()
            if result:
                results.append(result)
    
    # Save all changes to database
    db.session.commit()
    
    return jsonify({
        'success': True,
        'results': results
    })

# ==================== GROUP MANAGEMENT ====================

@app.route('/admin/groups')
@login_required
def admin_groups():
    """Admin: Manage computer groups"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    groups = ComputerGroup.query.order_by(ComputerGroup.name).all()
    return render_template('admin_groups.html', groups=groups)

@app.route('/admin/groups/add', methods=['GET', 'POST'])
@login_required
def admin_add_group():
    """Admin: Add new group"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        color = request.form.get('color', '#0066cc').strip()
        icon = request.form.get('icon', 'fas fa-folder').strip()
        computer_ids = request.form.getlist('computers')
        allow_wake = request.form.get('allow_wake') == '1'
        allow_shutdown = request.form.get('allow_shutdown') == '1'
        
        if not name:
            flash('Naziv grupe je obavezan', 'error')
            return redirect(url_for('admin_add_group'))
        
        if ComputerGroup.query.filter_by(name=name).first():
            flash('Grupa sa tim nazivom već postoji', 'error')
            return redirect(url_for('admin_add_group'))
        
        group = ComputerGroup(
            name=name,
            description=description or None,
            color=color,
            icon=icon,
            allow_wake=allow_wake,
            allow_shutdown=allow_shutdown
        )
        
        for cid in computer_ids:
            computer = Computer.query.get(int(cid))
            if computer:
                group.computers.append(computer)
        
        db.session.add(group)
        db.session.commit()
        
        # Audit log: Group created
        AuditLog.log_action(
            action='group_create',
            user=current_user,
            resource_type='group',
            resource_id=group.id,
            status='success',
            details=f'Created group "{name}" with {len(computer_ids)} computers',
            ip_address=get_real_ip(),
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Grupa "{name}" je uspešno kreirana', 'success')
        return redirect(url_for('admin_groups'))
    
    computers = Computer.query.order_by(Computer.name).all()
    return render_template('admin_add_group.html', computers=computers)

@app.route('/admin/groups/<int:group_id>/edit', methods=['GET', 'POST'])
@login_required
def admin_edit_group(group_id):
    """Admin: Edit group"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    group = ComputerGroup.query.get_or_404(group_id)
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        color = request.form.get('color', '#0066cc').strip()
        icon = request.form.get('icon', 'fas fa-folder').strip()
        computer_ids = request.form.getlist('computers')
        allow_wake = request.form.get('allow_wake') == '1'
        allow_shutdown = request.form.get('allow_shutdown') == '1'
        
        if not name:
            flash('Naziv grupe je obavezan', 'error')
            return redirect(url_for('admin_edit_group', group_id=group_id))
        
        existing = ComputerGroup.query.filter_by(name=name).first()
        if existing and existing.id != group.id:
            flash('Grupa sa tim nazivom već postoji', 'error')
            return redirect(url_for('admin_edit_group', group_id=group_id))
        
        group.name = name
        group.description = description or None
        group.color = color
        group.icon = icon
        group.allow_wake = allow_wake
        group.allow_shutdown = allow_shutdown
        
        group.computers = []
        for cid in computer_ids:
            computer = Computer.query.get(int(cid))
            if computer:
                group.computers.append(computer)
        
        db.session.commit()
        
        # Audit log: Group updated
        AuditLog.log_action(
            action='group_update',
            user=current_user,
            resource_type='group',
            resource_id=group.id,
            status='success',
            details=f'Updated group "{name}" with {len(computer_ids)} computers',
            ip_address=get_real_ip(),
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Grupa "{name}" je ažurirana', 'success')
        return redirect(url_for('admin_groups'))
    
    computers = Computer.query.order_by(Computer.name).all()
    return render_template('admin_edit_group.html', group=group, computers=computers)

@app.route('/admin/groups/<int:group_id>/delete', methods=['POST'])
@login_required
def admin_delete_group(group_id):
    """Admin: Delete group"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    group = ComputerGroup.query.get_or_404(group_id)
    name = group.name
    db.session.delete(group)
    db.session.commit()
    
    # Audit log: Group deleted
    AuditLog.log_action(
        action='group_delete',
        user=current_user,
        resource_type='group',
        resource_id=group_id,
        status='success',
        details=f'Deleted group "{name}"',
        ip_address=get_real_ip(),
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({'success': True, 'message': f'Grupa "{name}" je obrisana'})

# ==================== APP SETTINGS ====================

@app.route('/admin/settings', methods=['GET', 'POST'])
@login_required
def admin_settings():
    """Admin: Application settings"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        # Update settings
        enable_groups = request.form.get('enable_groups') == 'on'
        enable_search = request.form.get('enable_search') == 'on'
        app_language = request.form.get('app_language', 'sr')
        if app_language not in ('sr', 'en'):
            app_language = 'sr'
        
        AppSettings.set('enable_groups', str(enable_groups).lower(), 
                       'Omogući organizaciju računara u grupe')
        AppSettings.set('enable_search', str(enable_search).lower(), 
                       'Omogući pretraživanje računara')
        AppSettings.set('app_language', app_language,
                       'Jezik korisničkog interfejsa')
        
        db.session.commit()
        flash('Podešavanja su sačuvana', 'success')
        return redirect(url_for('admin_settings'))
    
    # Get current settings
    settings = {
        'enable_groups': AppSettings.get_bool('enable_groups', default=True),
        'enable_search': AppSettings.get_bool('enable_search', default=True),
        'app_language': AppSettings.get('app_language', 'sr') or 'sr',
    }
    
    return render_template('admin_settings.html', settings=settings)

@app.route('/admin/delete-logs', methods=['POST'])
@login_required
def admin_delete_logs():
    """Admin: Delete WOL logs"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    try:
        data = request.get_json()
        delete_option = data.get('option')
        
        if delete_option == 'all':
            # Delete all logs
            count = WOLLog.query.count()
            WOLLog.query.delete()
            db.session.commit()
            return jsonify({'success': True, 'message': f'Obrisano {count} logova'})
        
        elif delete_option == 'range':
            # Delete logs in date range
            from_date_str = data.get('from_date')
            to_date_str = data.get('to_date')
            
            if not from_date_str or not to_date_str:
                return jsonify({'success': False, 'message': 'Nedostaju datumi'}), 400
            
            try:
                from_date = datetime.strptime(from_date_str, '%Y-%m-%d')
                to_date = datetime.strptime(to_date_str, '%Y-%m-%d')
                to_date = to_date.replace(hour=23, minute=59, second=59)
                
                logs_query = WOLLog.query.filter(
                    WOLLog.timestamp >= from_date,
                    WOLLog.timestamp <= to_date
                )
                count = logs_query.count()
                logs_query.delete()
                db.session.commit()
                
                return jsonify({'success': True, 'message': f'Obrisano {count} logova za period {from_date_str} do {to_date_str}'})
            except ValueError as e:
                return jsonify({'success': False, 'message': 'Neispravan format datuma'}), 400
        else:
            return jsonify({'success': False, 'message': 'Nepoznata opcija brisanja'}), 400
            
    except Exception as e:
        logger.error(f"Error deleting logs: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/groups/<int:group_id>/wake', methods=['POST'])
@login_required
def wake_group(group_id):
    """Wake all computers in a group"""
    group = ComputerGroup.query.get_or_404(group_id)
    
    results = []
    for computer in group.computers:
        # Check if user has access
        if not current_user.is_admin and current_user not in computer.assigned_users:
            results.append({'name': computer.name, 'success': False, 'message': 'Pristup odbijen'})
            continue
        
        success, message = send_wol_packet(computer.mac_address, ip_address=computer.ip_address)
        
        log = WOLLog(user_id=current_user.id, computer_id=computer.id, status='sent' if success else 'failed')
        db.session.add(log)
        computer.last_wol = datetime.utcnow()
        
        results.append({'name': computer.name, 'success': success, 'message': message})
    
    db.session.commit()
    
    sent = sum(1 for r in results if r['success'])
    return jsonify({
        'success': True,
        'message': f'WoL poslat na {sent}/{len(results)} računara u grupi "{group.name}"',
        'results': results
    })

# ==================== ANGULAR FRONTEND API ====================
# JSON API endpoints for the Angular SPA frontend

def _serialize_user(user):
    """Serialize a User object to dict"""
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_admin': user.is_admin,
        'can_view_groups': getattr(user, 'can_view_groups', True),
        'created_at': user.created_at.isoformat() if user.created_at else None
    }

def _serialize_computer(computer, include_ssh=False):
    """Serialize a Computer object to dict"""
    data = {
        'id': computer.id,
        'name': computer.name,
        'mac_address': computer.mac_address,
        'ip_address': computer.ip_address,
        'description': computer.description,
        'status': computer.status or 'unknown',
        'os_type': computer.os_type or 'linux',
        'last_wol': computer.last_wol.isoformat() if computer.last_wol else None,
        'last_shutdown': computer.last_shutdown.isoformat() if computer.last_shutdown else None,
        'last_checked': computer.last_checked.isoformat() if computer.last_checked else None,
        'created_at': computer.created_at.isoformat() if computer.created_at else None,
        'has_ssh': bool(computer.ssh_username and computer._ssh_password_encrypted),
        'ssh_auto_login': computer.ssh_auto_login,
        'assigned_users': [{'id': u.id, 'username': u.username} for u in computer.assigned_users],
        'groups': [{'id': g.id, 'name': g.name} for g in computer.groups]
    }
    if include_ssh:
        data['ssh_host'] = computer.ssh_host
        data['ssh_port'] = computer.ssh_port
        data['ssh_username'] = computer.ssh_username
        data['has_ssh_password'] = bool(computer._ssh_password_encrypted)
    return data

def _serialize_group(group, include_computers=True):
    """Serialize a ComputerGroup object to dict"""
    data = {
        'id': group.id,
        'name': group.name,
        'description': group.description,
        'color': group.color,
        'icon': group.icon,
        'allow_wake': group.allow_wake,
        'allow_shutdown': group.allow_shutdown,
        'created_at': group.created_at.isoformat() if group.created_at else None
    }
    if include_computers:
        data['computers'] = [{'id': c.id, 'name': c.name, 'ip_address': c.ip_address, 'status': c.status} for c in group.computers]
    return data


# --- Auth ---
@app.route('/api/angular/auth/me', methods=['GET'])
@login_required
def angular_auth_me():
    """Get current user info"""
    return jsonify({'success': True, 'data': _serialize_user(current_user)})

@app.route('/api/angular/auth/login', methods=['POST'])
def angular_auth_login():
    """Login via JSON API"""
    from flask_login import login_user
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    remember = data.get('remember', False)

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        AuditLog.log_action(
            action='login_failed',
            user=None,
            resource_type='auth',
            status='failed',
            details=f'Failed login attempt for "{username}"',
            ip_address=get_real_ip(),
            user_agent=request.headers.get('User-Agent')
        )
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    login_user(user, remember=remember)

    AuditLog.log_action(
        action='login',
        user=user,
        resource_type='auth',
        status='success',
        details=f'User "{username}" logged in via web interface',
        ip_address=get_real_ip(),
        user_agent=request.headers.get('User-Agent')
    )

    return jsonify({'success': True, 'data': _serialize_user(user)})

@app.route('/api/angular/auth/logout', methods=['POST'])
@login_required
def angular_auth_logout():
    """Logout via JSON API"""
    from flask_login import logout_user
    username = current_user.username
    logout_user()
    return jsonify({'success': True, 'message': f'{username} logged out'})


# --- Dashboard ---
@app.route('/api/angular/dashboard', methods=['GET'])
@login_required
def angular_dashboard():
    """Dashboard data as JSON"""
    computers = current_user.computers
    enable_groups = AppSettings.get_bool('enable_groups', default=True)
    enable_search = AppSettings.get_bool('enable_search', default=True)
    show_groups = enable_groups and (current_user.is_admin or current_user.can_view_groups)

    groups = ComputerGroup.query.order_by(ComputerGroup.name).all() if show_groups else []

    # Per-user roles
    user_roles = {}
    if computers:
        comp_ids = [c.id for c in computers]
        prefs = UserComputerPreference.query.filter(
            UserComputerPreference.user_id == current_user.id,
            UserComputerPreference.computer_id.in_(comp_ids)
        ).all()
        user_roles = {str(p.computer_id): (p.role or 'operator') for p in prefs}

    return jsonify({
        'success': True,
        'data': {
            'computers': [_serialize_computer(c) for c in computers],
            'groups': [_serialize_group(g) for g in groups],
            'enable_groups': show_groups,
            'enable_search': enable_search,
            'user_roles': user_roles
        }
    })


# --- History ---
@app.route('/api/angular/history', methods=['GET'])
@login_required
def angular_history():
    """History data as JSON"""
    search_query = request.args.get('search', '').strip()
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')

    # WOL logs
    wol_query = WOLLog.query
    if not current_user.is_admin:
        wol_query = wol_query.filter(WOLLog.user_id == current_user.id)
    if search_query:
        wol_query = wol_query.join(Computer).join(User).filter(
            db.or_(Computer.name.ilike(f'%{search_query}%'), User.username.ilike(f'%{search_query}%'))
        )
    if date_from:
        try:
            wol_query = wol_query.filter(WOLLog.timestamp >= datetime.strptime(date_from, '%Y-%m-%d'))
        except ValueError:
            pass
    if date_to:
        try:
            to = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            wol_query = wol_query.filter(WOLLog.timestamp <= to)
        except ValueError:
            pass

    wol_logs = wol_query.order_by(WOLLog.timestamp.desc()).limit(500).all()

    # Shutdown logs
    sd_query = ShutdownLog.query
    if not current_user.is_admin:
        sd_query = sd_query.filter(ShutdownLog.user_id == current_user.id)
    if search_query:
        sd_query = sd_query.join(Computer).filter(Computer.name.ilike(f'%{search_query}%'))
    if date_from:
        try:
            sd_query = sd_query.filter(ShutdownLog.timestamp >= datetime.strptime(date_from, '%Y-%m-%d'))
        except ValueError:
            pass
    if date_to:
        try:
            to = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            sd_query = sd_query.filter(ShutdownLog.timestamp <= to)
        except ValueError:
            pass

    shutdown_logs = sd_query.order_by(ShutdownLog.timestamp.desc()).limit(500).all()

    # Audit logs (admin only)
    audit_logs = []
    if current_user.is_admin:
        aq = AuditLog.query
        if search_query:
            aq = aq.filter(db.or_(
                AuditLog.action.ilike(f'%{search_query}%'),
                AuditLog.username.ilike(f'%{search_query}%'),
                AuditLog.details.ilike(f'%{search_query}%')
            ))
        if date_from:
            try:
                aq = aq.filter(AuditLog.timestamp >= datetime.strptime(date_from, '%Y-%m-%d'))
            except ValueError:
                pass
        if date_to:
            try:
                to = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
                aq = aq.filter(AuditLog.timestamp <= to)
            except ValueError:
                pass
        audit_logs = aq.order_by(AuditLog.timestamp.desc()).limit(500).all()

    return jsonify({
        'success': True,
        'data': {
            'wol_logs': [{
                'id': l.id, 'computer_name': l.computer.name if l.computer else 'N/A',
                'username': l.user.username if l.user else 'N/A',
                'timestamp': l.timestamp.isoformat() + 'Z', 'status': l.status
            } for l in wol_logs],
            'shutdown_logs': [{
                'id': l.id, 'computer_name': l.computer.name if l.computer else 'N/A',
                'username': l.user.username if l.user else 'N/A',
                'timestamp': l.timestamp.isoformat() + 'Z', 'status': l.status,
                'error_message': l.error_message
            } for l in shutdown_logs],
            'audit_logs': [{
                'id': l.id, 'action': l.action, 'username': l.username or 'N/A',
                'timestamp': l.timestamp.isoformat() + 'Z', 'status': l.status,
                'resource_type': l.resource_type, 'details': l.details,
                'ip_address': l.ip_address
            } for l in audit_logs],
            'is_admin': current_user.is_admin
        }
    })


# --- Admin: Computers ---
@app.route('/api/angular/admin/computers', methods=['GET'])
@login_required
def angular_admin_computers():
    """Admin: list computers JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    computers = Computer.query.order_by(Computer.name).all()
    return jsonify({'success': True, 'data': {'computers': [_serialize_computer(c, include_ssh=True) for c in computers]}})

@app.route('/api/angular/admin/computers/<int:cid>', methods=['GET'])
@login_required
def angular_admin_computer_detail(cid):
    """Admin: computer detail JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    computer = Computer.query.get_or_404(cid)
    users = User.query.order_by(User.username).all()

    # Get user roles
    prefs = UserComputerPreference.query.filter_by(computer_id=cid).all()
    user_roles = {str(p.user_id): p.role or 'operator' for p in prefs}

    return jsonify({
        'success': True,
        'data': {
            'computer': _serialize_computer(computer, include_ssh=True),
            'users': [_serialize_user(u) for u in users],
            'user_roles': user_roles
        }
    })

@app.route('/api/angular/admin/computers', methods=['POST'])
@login_required
def angular_admin_create_computer():
    """Admin: create computer JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    mac_address = data.get('mac_address', '').strip().upper()

    if not name or not mac_address:
        return jsonify({'success': False, 'message': 'Name and MAC address required'}), 400

    if not validate_mac_address(mac_address):
        return jsonify({'success': False, 'message': 'Invalid MAC address format'}), 400

    if Computer.query.filter_by(mac_address=mac_address).first():
        return jsonify({'success': False, 'message': 'MAC address already registered'}), 400

    computer = Computer(
        name=name, mac_address=mac_address,
        ip_address=data.get('ip_address', '').strip() or None,
        description=data.get('description', '').strip() or None,
        os_type=data.get('os_type', 'linux'),
        ssh_host=data.get('ssh_host', '').strip() or None,
        ssh_port=int(data.get('ssh_port', 22)),
        ssh_username=data.get('ssh_username', '').strip() or None,
        ssh_password=data.get('ssh_password', '').strip() or None,
        ssh_auto_login=data.get('ssh_auto_login', False),
        created_by_id=None
    )

    db.session.add(computer)
    db.session.flush()

    # Assign users with roles
    assigned_users = data.get('assigned_users', [])
    owner_ids = []
    for entry in assigned_users:
        uid = entry.get('user_id') or entry
        role = entry.get('role', 'operator') if isinstance(entry, dict) else 'operator'
        user = User.query.get(int(uid))
        if user:
            computer.assigned_users.append(user)
            if role == 'owner':
                owner_ids.append(user.id)
            pref = UserComputerPreference(user_id=user.id, computer_id=computer.id, role=role, ssh_auto_login=False)
            db.session.add(pref)

    if owner_ids:
        computer.created_by_id = owner_ids[0]

    db.session.commit()

    AuditLog.log_action(
        action='computer_create', user=current_user, resource_type='computer',
        resource_id=computer.id, status='success',
        details=f'Created computer "{name}" via admin panel',
        ip_address=get_real_ip(), user_agent=request.headers.get('User-Agent')
    )

    return jsonify({'success': True, 'message': f'Computer "{name}" created', 'data': {'id': computer.id}})

@app.route('/api/angular/admin/computers/<int:cid>', methods=['PUT'])
@login_required
def angular_admin_update_computer(cid):
    """Admin: update computer JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    computer = Computer.query.get_or_404(cid)
    data = request.get_json() or {}

    computer.name = data.get('name', computer.name).strip()
    computer.ip_address = data.get('ip_address', '').strip() or None
    computer.description = data.get('description', '').strip() or None
    computer.os_type = data.get('os_type', computer.os_type)
    computer.ssh_host = data.get('ssh_host', '').strip() or None
    computer.ssh_port = int(data.get('ssh_port', computer.ssh_port or 22))
    computer.ssh_username = data.get('ssh_username', '').strip() or None
    computer.ssh_auto_login = data.get('ssh_auto_login', computer.ssh_auto_login)

    new_password = data.get('ssh_password', '').strip()
    if new_password:
        computer.ssh_password = new_password

    # Update user assignments
    if 'assigned_users' in data:
        # Clear existing
        computer.assigned_users = []
        UserComputerPreference.query.filter_by(computer_id=cid).delete()
        db.session.flush()

        owner_ids = []
        for entry in data['assigned_users']:
            uid = entry.get('user_id') or entry
            role = entry.get('role', 'operator') if isinstance(entry, dict) else 'operator'
            user = User.query.get(int(uid))
            if user:
                computer.assigned_users.append(user)
                if role == 'owner':
                    owner_ids.append(user.id)
                pref = UserComputerPreference(user_id=user.id, computer_id=computer.id, role=role, ssh_auto_login=False)
                db.session.add(pref)

        if owner_ids:
            computer.created_by_id = owner_ids[0]

    db.session.commit()

    AuditLog.log_action(
        action='computer_update', user=current_user, resource_type='computer',
        resource_id=computer.id, status='success',
        details=f'Updated computer "{computer.name}" via admin panel',
        ip_address=get_real_ip(), user_agent=request.headers.get('User-Agent')
    )

    return jsonify({'success': True, 'message': f'Computer "{computer.name}" updated'})


# --- Admin: Users ---
@app.route('/api/angular/admin/users', methods=['GET'])
@login_required
def angular_admin_users():
    """Admin: list users JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    users = User.query.order_by(User.username).all()
    return jsonify({'success': True, 'data': {'users': [_serialize_user(u) for u in users]}})

@app.route('/api/angular/admin/users', methods=['POST'])
@login_required
def angular_admin_create_user():
    """Admin: create user JSON"""
    if not validate_admin_status(current_user.id):
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    is_admin = data.get('is_admin', False)

    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'All fields required'}), 400
    if len(username) < 3:
        return jsonify({'success': False, 'message': 'Username must be at least 3 characters'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': 'Username already exists'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already exists'}), 400

    user = User(username=username, email=email, is_admin=is_admin)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    AuditLog.log_action(
        action='user_create', user=current_user, resource_type='user',
        resource_id=user.id, status='success',
        details=f'Created user "{username}" via admin panel',
        ip_address=get_real_ip(), user_agent=request.headers.get('User-Agent')
    )

    return jsonify({'success': True, 'message': f'User "{username}" created', 'data': {'id': user.id}})


# --- Admin: Groups ---
@app.route('/api/angular/admin/groups', methods=['GET'])
@login_required
def angular_admin_groups():
    """Admin: list groups JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    groups = ComputerGroup.query.order_by(ComputerGroup.name).all()
    return jsonify({'success': True, 'data': {'groups': [_serialize_group(g) for g in groups]}})

@app.route('/api/angular/admin/groups/<int:gid>', methods=['GET'])
@login_required
def angular_admin_group_detail(gid):
    """Admin: group detail JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    group = ComputerGroup.query.get_or_404(gid)
    computers = Computer.query.order_by(Computer.name).all()
    return jsonify({
        'success': True,
        'data': {
            'group': _serialize_group(group),
            'computers': [{'id': c.id, 'name': c.name, 'ip_address': c.ip_address} for c in computers]
        }
    })

@app.route('/api/angular/admin/groups', methods=['POST'])
@login_required
def angular_admin_create_group():
    """Admin: create group JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'success': False, 'message': 'Group name required'}), 400
    if ComputerGroup.query.filter_by(name=name).first():
        return jsonify({'success': False, 'message': 'Group name already exists'}), 400

    group = ComputerGroup(
        name=name, description=data.get('description', '').strip() or None,
        color=data.get('color', '#0066cc'), icon=data.get('icon', 'fas fa-folder'),
        allow_wake=data.get('allow_wake', True), allow_shutdown=data.get('allow_shutdown', True)
    )

    for cid in data.get('computer_ids', []):
        c = Computer.query.get(int(cid))
        if c:
            group.computers.append(c)

    db.session.add(group)
    db.session.commit()

    AuditLog.log_action(
        action='group_create', user=current_user, resource_type='group',
        resource_id=group.id, status='success',
        details=f'Created group "{name}" via admin panel',
        ip_address=get_real_ip(), user_agent=request.headers.get('User-Agent')
    )

    return jsonify({'success': True, 'message': f'Group "{name}" created', 'data': {'id': group.id}})

@app.route('/api/angular/admin/groups/<int:gid>', methods=['PUT'])
@login_required
def angular_admin_update_group(gid):
    """Admin: update group JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    group = ComputerGroup.query.get_or_404(gid)
    data = request.get_json() or {}

    name = data.get('name', group.name).strip()
    existing = ComputerGroup.query.filter_by(name=name).first()
    if existing and existing.id != group.id:
        return jsonify({'success': False, 'message': 'Group name already exists'}), 400

    group.name = name
    group.description = data.get('description', '').strip() or None
    group.color = data.get('color', group.color)
    group.icon = data.get('icon', group.icon)
    group.allow_wake = data.get('allow_wake', group.allow_wake)
    group.allow_shutdown = data.get('allow_shutdown', group.allow_shutdown)

    if 'computer_ids' in data:
        group.computers = []
        for cid in data['computer_ids']:
            c = Computer.query.get(int(cid))
            if c:
                group.computers.append(c)

    db.session.commit()

    AuditLog.log_action(
        action='group_update', user=current_user, resource_type='group',
        resource_id=group.id, status='success',
        details=f'Updated group "{name}" via admin panel',
        ip_address=get_real_ip(), user_agent=request.headers.get('User-Agent')
    )

    return jsonify({'success': True, 'message': f'Group "{name}" updated'})


# --- Admin: Settings ---
@app.route('/api/angular/admin/settings', methods=['GET'])
@login_required
def angular_admin_settings_get():
    """Admin: get settings JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    settings = {
        'enable_groups': AppSettings.get_bool('enable_groups', default=True),
        'enable_search': AppSettings.get_bool('enable_search', default=True),
        'language': AppSettings.get('app_language', 'sr') or 'sr',
        'app_title': AppSettings.get('app_title', 'WOL Manager') or 'WOL Manager',
        'max_computers_per_page': int(AppSettings.get('max_computers_per_page', '20') or 20),
    }

    system_info = {
        'total_users': User.query.count(),
        'total_computers': Computer.query.count(),
        'total_groups': ComputerGroup.query.count(),
        'version': '1.0.0'
    }

    return jsonify({'success': True, 'data': {'settings': settings, 'system_info': system_info}})

@app.route('/api/angular/admin/settings', methods=['POST'])
@login_required
def angular_admin_settings_save():
    """Admin: save settings JSON"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    data = request.get_json() or {}

    if 'enable_groups' in data:
        AppSettings.set('enable_groups', str(data['enable_groups']).lower(), 'Enable groups')
    if 'enable_search' in data:
        AppSettings.set('enable_search', str(data['enable_search']).lower(), 'Enable search')
    if 'language' in data:
        lang = data['language']
        if lang in ('sr', 'en'):
            AppSettings.set('app_language', lang, 'UI Language')
    if 'app_title' in data:
        AppSettings.set('app_title', data['app_title'], 'Application title')
    if 'max_computers_per_page' in data:
        AppSettings.set('max_computers_per_page', str(data['max_computers_per_page']), 'Max computers per page')

    db.session.commit()
    return jsonify({'success': True, 'message': 'Settings saved'})


# --- Admin: Clear Logs ---
@app.route('/api/angular/admin/clear-logs', methods=['POST'])
@login_required
def angular_admin_clear_logs():
    """Admin: clear all logs"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'}), 403

    try:
        wol_count = WOLLog.query.count()
        sd_count = ShutdownLog.query.count()
        audit_count = AuditLog.query.count()

        WOLLog.query.delete()
        ShutdownLog.query.delete()
        AuditLog.query.delete()
        db.session.commit()

        return jsonify({'success': True, 'message': f'Cleared {wol_count + sd_count + audit_count} logs'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== STATISTICS ====================

@app.route('/statistics')
@login_required
def statistics():
    """Statistics page with uptime graphs"""
    if current_user.is_admin:
        computers = Computer.query.order_by(Computer.name).all()
    else:
        computers = current_user.computers
    
    return render_template('statistics.html', computers=computers)

@app.route('/api/statistics/data', methods=['GET'])
@login_required
def statistics_data():
    """Get statistics data for charts"""
    from sqlalchemy import func
    import datetime as dt
    
    days = request.args.get('days', 7, type=int)
    days = min(days, 90)  # Max 90 days
    
    cutoff = datetime.utcnow() - dt.timedelta(days=days)
    
    if current_user.is_admin:
        computers = Computer.query.all()
    else:
        computers = current_user.computers
    
    computer_stats = []
    stats_dirty = False
    for computer in computers:
        # Uptime logs
        logs = UptimeLog.query.filter(
            UptimeLog.computer_id == computer.id,
            UptimeLog.timestamp >= cutoff
        ).order_by(UptimeLog.timestamp).all()

        # If no uptime logs, create a baseline entry from live status
        if not logs and computer.ip_address:
            try:
                is_online, status = check_host_status(computer.ip_address)
                if status in ('online', 'offline'):
                    baseline_time = datetime.utcnow()
                    baseline_entry = UptimeLog(
                        computer_id=computer.id,
                        status=status,
                        timestamp=baseline_time
                    )
                    db.session.add(baseline_entry)
                    computer.status = status
                    computer.last_checked = baseline_time
                    stats_dirty = True
                    logs = [baseline_entry]
            except Exception:
                pass
        
        # If no UptimeLog entries, build from WOL + Shutdown logs
        if not logs:
            wol_logs = WOLLog.query.filter(
                WOLLog.computer_id == computer.id,
                WOLLog.timestamp >= cutoff,
                WOLLog.status == 'sent'
            ).all()
            shutdown_logs_list = ShutdownLog.query.filter(
                ShutdownLog.computer_id == computer.id,
                ShutdownLog.timestamp >= cutoff,
                ShutdownLog.status == 'success'
            ).all()
            combined = []
            for w in wol_logs:
                combined.append((w.timestamp, 'online'))
            for s in shutdown_logs_list:
                combined.append((s.timestamp, 'offline'))
            combined.sort(key=lambda x: x[0])
        else:
            combined = [(l.timestamp, l.status) for l in logs]
        
        # Calculate total online time
        online_seconds = 0.0
        last_online_time = None
        for ts, status in combined:
            if status == 'online':
                last_online_time = ts
            elif status == 'offline' and last_online_time:
                online_seconds += (ts - last_online_time).total_seconds()
                last_online_time = None
        
        # If still online, count up to now (even if status is stale)
        if last_online_time:
            online_seconds += (datetime.utcnow() - last_online_time).total_seconds()
        
        total_seconds = float(days * 86400)
        uptime_pct = round((online_seconds / total_seconds) * 100, 1) if total_seconds > 0 else 0.0
        
        # WoL count
        wol_count = WOLLog.query.filter(
            WOLLog.computer_id == computer.id,
            WOLLog.timestamp >= cutoff
        ).count()
        
        # Shutdown count
        shutdown_count = ShutdownLog.query.filter(
            ShutdownLog.computer_id == computer.id,
            ShutdownLog.timestamp >= cutoff
        ).count()
        
        # Timeline data
        timeline = []
        for ts, status in combined:
            timeline.append({
                'time': ts.isoformat(),
                'status': status
            })
        
        computer_stats.append({
            'id': computer.id,
            'name': computer.name,
            'os_type': computer.os_type or 'unknown',
            'current_status': computer.status or 'unknown',
            'uptime_pct': uptime_pct,
            'online_hours': round(online_seconds / 3600, 1),
            'wol_count': wol_count,
            'shutdown_count': shutdown_count,
            'timeline': timeline
        })
    
    if stats_dirty:
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()

    return jsonify({'success': True, 'stats': computer_stats, 'days': days})

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

# CLI commands
@app.cli.command()
def init_db():
    """Initialize the database."""
    db.create_all()
    print('âœ“ Baza je inicijalizovana.')

@app.cli.command()
def create_admin():
    """Create admin user."""
    username = input('Korisničko ime: ')
    email = input('Email: ')
    password = input('Lozinka: ')
    
    if User.query.filter_by(username=username).first():
        print('âœ— Korisnik već postoji!')
        return
    
    admin = User(username=username, email=email, is_admin=True)
    admin.set_password(password)
    
    db.session.add(admin)
    db.session.commit()
    
    print(f'âœ“ Admin korisnik "{username}" je kreiran!')

# ==================== WEBSOCKET EVENTS ====================

# Background thread for status monitoring
status_monitor_thread = None
status_monitor_running = False

def check_single_computer_status(computer_id, ip_address):
    """Check status of a single computer (for parallel execution)"""
    try:
        is_online, status = check_host_status(ip_address)
        return (computer_id, status, True)
    except Exception as e:
        logger.error(f"Error checking status for computer {computer_id}: {e}")
        return (computer_id, 'unknown', False)

def monitor_computer_status():
    """Background thread that monitors computer status - OPTIMIZED with parallel checks"""
    global status_monitor_running
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    while status_monitor_running:
        with app.app_context():
            try:
                # Fetch all computers with IP addresses
                computers = Computer.query.filter(Computer.ip_address.isnot(None)).all()
                
                if not computers:
                    time.sleep(10)
                    continue
                
                # Parallel status checks with timeout
                status_updates = []
                with ThreadPoolExecutor(max_workers=min(10, len(computers))) as executor:
                    # Submit all tasks
                    future_to_computer = {
                        executor.submit(check_host_status, comp.ip_address): comp 
                        for comp in computers
                    }
                    
                    # Process results as they complete
                    for future in as_completed(future_to_computer, timeout=8):
                        computer = future_to_computer[future]
                        try:
                            is_online, status = future.result(timeout=2)
                            status_updates.append((computer, status))
                        except Exception as e:
                            logger.debug(f"Status check failed for {computer.name}: {e}")
                            status_updates.append((computer, 'unknown'))
                
                # Batch database updates
                now = datetime.utcnow()
                changes = []
                for computer, new_status in status_updates:
                    if computer.status != new_status:
                        # Log uptime change
                        if new_status in ('online', 'offline'):
                            try:
                                uptime_entry = UptimeLog(computer_id=computer.id, status=new_status)
                                db.session.add(uptime_entry)
                            except Exception:
                                pass
                        
                        computer.status = new_status
                        computer.last_checked = now
                        changes.append({
                            'computer_id': computer.id,
                            'status': new_status,
                            'last_checked': now.strftime('%Y-%m-%d %H:%M:%S')
                        })
                
                # Commit all changes at once
                if changes:
                    db.session.commit()
                    
                    # Emit all status updates
                    for change in changes:
                        socketio.emit('status_update', change, namespace='/')
                
            except Exception as e:
                logger.error(f"Error in status monitor: {e}")
                db.session.rollback()
        
        # Check every 15 seconds (reduced from 10 for less load)
        time.sleep(15)

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    
    # Start status monitor thread if not running
    global status_monitor_thread, status_monitor_running
    if status_monitor_thread is None or not status_monitor_thread.is_alive():
        status_monitor_running = True
        status_monitor_thread = threading.Thread(target=monitor_computer_status, daemon=True)
        status_monitor_thread.start()
    
    # Send current status of all computers
    with app.app_context():
        computers = Computer.query.all()
        for computer in computers:
            emit('status_update', {
                'computer_id': computer.id,
                'status': computer.status,
                'last_checked': computer.last_checked.strftime('%Y-%m-%d %H:%M:%S') if computer.last_checked else None
            })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')
    # Clean up SSH terminal session if any
    _close_terminal_session(request.sid, reason='client disconnect')

@socketio.on('request_status')
def handle_request_status(data):
    """Handle manual status check request"""
    computer_id = data.get('computer_id')
    
    with app.app_context():
        computer = Computer.query.get(computer_id)
        if computer and computer.ip_address:
            is_online, status = check_host_status(computer.ip_address)
            computer.status = status
            computer.last_checked = datetime.utcnow()
            db.session.commit()
            
            emit('status_update', {
                'computer_id': computer.id,
                'status': status,
                'last_checked': computer.last_checked.strftime('%Y-%m-%d %H:%M:%S')
            })

# ==================== SSH TERMINAL ====================

import paramiko as paramiko_lib

# Active SSH terminal sessions: { request.sid: { 'client': SSHClient, 'channel': Channel, 'last_activity': float } }
ssh_terminal_sessions = {}
SSH_TERMINAL_TIMEOUT = 900  # 15 minutes inactivity timeout

def _ssh_terminal_cleanup_loop():
    """Background thread that closes idle SSH terminal sessions"""
    while True:
        time.sleep(60)
        now = time.time()
        stale_sids = []
        for sid, sess in list(ssh_terminal_sessions.items()):
            if now - sess.get('last_activity', 0) > SSH_TERMINAL_TIMEOUT:
                stale_sids.append(sid)
        for sid in stale_sids:
            _close_terminal_session(sid, reason='inactivity timeout')
            try:
                socketio.emit('terminal_closed', {'reason': 'Session timed out after 15 minutes of inactivity'}, to=sid)
            except Exception:
                pass

_terminal_cleanup_thread = threading.Thread(target=_ssh_terminal_cleanup_loop, daemon=True)
_terminal_cleanup_thread.start()

def _close_terminal_session(sid, reason='disconnect'):
    """Safely close and remove an SSH terminal session"""
    sess = ssh_terminal_sessions.pop(sid, None)
    if sess is None:
        return
    channel = sess.get('channel')
    client = sess.get('client')
    computer_id = sess.get('computer_id')
    if channel:
        try:
            channel.close()
        except Exception:
            pass
    if client:
        try:
            client.close()
        except Exception:
            pass
    # Audit log
    if computer_id:
        try:
            with app.app_context():
                user_id = sess.get('user_id')
                username = sess.get('username', 'unknown')
                AuditLog.log_action(
                    action='terminal_close',
                    user=User.query.get(user_id) if user_id else None,
                    resource_type='computer',
                    resource_id=computer_id,
                    status='success',
                    details=f'SSH terminal closed ({reason})',
                )
        except Exception:
            pass

def _ssh_read_thread(sid, channel):
    """Daemon thread: reads from SSH channel and emits to client"""
    try:
        while True:
            if channel.closed:
                break
            if channel.recv_ready():
                data = channel.recv(4096)
                if not data:
                    break
                ssh_terminal_sessions.get(sid, {})['last_activity'] = time.time()
                socketio.emit('terminal_output', {'data': data.decode('utf-8', errors='replace')}, to=sid)
            elif channel.recv_stderr_ready():
                data = channel.recv_stderr(4096)
                if data:
                    ssh_terminal_sessions.get(sid, {})['last_activity'] = time.time()
                    socketio.emit('terminal_output', {'data': data.decode('utf-8', errors='replace')}, to=sid)
            elif channel.exit_status_ready():
                break
            else:
                time.sleep(0.05)
    except Exception:
        pass
    finally:
        socketio.emit('terminal_closed', {'reason': 'SSH connection closed'}, to=sid)
        _close_terminal_session(sid, reason='channel EOF')

@socketio.on('terminal_connect')
def handle_terminal_connect(data):
    """Open an SSH terminal session for a given computer"""
    from flask_login import current_user as sock_user

    computer_id = data.get('computer_id')
    manual_password = data.get('manual_password')  # Password provided by user if auto-login disabled
    cols = data.get('cols', 80)
    rows = data.get('rows', 24)

    if not sock_user or not sock_user.is_authenticated:
        emit('terminal_error', {'message': 'Not authenticated'})
        return

    with app.app_context():
        computer = Computer.query.get(computer_id)
        if not computer:
            emit('terminal_error', {'message': 'Computer not found'})
            return

        # Authorization check
        if not sock_user.is_admin and sock_user not in computer.assigned_users:
            emit('terminal_error', {'message': 'Access denied'})
            return

        if not _can_operate(sock_user, computer):
            emit('terminal_error', {'message': 'Access denied'})
            return

        if not computer.ssh_username or not computer._ssh_password_encrypted:
            emit('terminal_error', {'message': 'SSH is not configured for this computer'})
            return

        ssh_host = computer.ssh_host if computer.ssh_host and computer.ssh_host.strip() else computer.ip_address
        ssh_port = computer.ssh_port or 22
        ssh_user = computer.ssh_username
        
        # Use manual password if provided (user didn't want auto-login), otherwise use stored password
        if manual_password:
            ssh_pass = manual_password
        else:
            ssh_pass = computer.ssh_password  # decrypted via property
            if not ssh_pass:
                if computer._ssh_password_encrypted:
                    emit('terminal_error', {'message': 'SSH lozinka ne može biti dekriptovana. Unesite je ručno.', 'code': 'DECRYPTION_FAILED'})
                else:
                    emit('terminal_error', {'message': 'SSH lozinka nije podešena. Otvorite podešavanja računara i unesite SSH kredencijale.'})
                return

        try:
            client = paramiko_lib.SSHClient()
            client.set_missing_host_key_policy(paramiko_lib.AutoAddPolicy())
            client.connect(
                hostname=ssh_host,
                port=ssh_port,
                username=ssh_user,
                password=ssh_pass,
                timeout=10,
                look_for_keys=False,
                allow_agent=False,
            )
            channel = client.invoke_shell(term='xterm-256color', width=cols, height=rows)
            channel.settimeout(0.0)

            ssh_terminal_sessions[request.sid] = {
                'client': client,
                'channel': channel,
                'computer_id': computer.id,
                'user_id': sock_user.id,
                'username': sock_user.username,
                'last_activity': time.time(),
            }

            # Start reader thread
            t = threading.Thread(target=_ssh_read_thread, args=(request.sid, channel), daemon=True)
            t.start()

            # Audit log
            AuditLog.log_action(
                action='terminal_open',
                user=sock_user,
                resource_type='computer',
                resource_id=computer.id,
                status='success',
                details=f'SSH terminal opened to {computer.name} ({ssh_host})',
                ip_address=get_real_ip() if hasattr(request, 'remote_addr') else None,
            )

            emit('terminal_ready', {'message': f'Connected to {computer.name}'})

        except paramiko_lib.AuthenticationException:
            emit('terminal_error', {'message': 'SSH authentication failed'})
        except paramiko_lib.NoValidConnectionsError:
            emit('terminal_error', {'message': 'Cannot connect to SSH server'})
        except Exception as e:
            emit('terminal_error', {'message': f'Connection failed: {str(e)}'})

@socketio.on('terminal_input')
def handle_terminal_input(data):
    """Forward keystrokes to SSH channel"""
    sess = ssh_terminal_sessions.get(request.sid)
    if not sess:
        return
    channel = sess.get('channel')
    if channel and not channel.closed:
        try:
            channel.send(data.get('data', ''))
            sess['last_activity'] = time.time()
        except Exception:
            pass

@socketio.on('terminal_resize')
def handle_terminal_resize(data):
    """Resize PTY"""
    sess = ssh_terminal_sessions.get(request.sid)
    if not sess:
        return
    channel = sess.get('channel')
    cols = data.get('cols', 80)
    rows = data.get('rows', 24)
    if channel and not channel.closed:
        try:
            channel.resize_pty(width=cols, height=rows)
        except Exception:
            pass

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # use_reloader=False is required by Flask-SocketIO - the Werkzeug reloader
    # restarts the process on every file save, causing 502 errors and dropped
    # Socket.IO connections. Templates still update live (Jinja2 reads from disk).
    socketio.run(app, host='0.0.0.0', port=5000, debug=True,
                 allow_unsafe_werkzeug=True, use_reloader=False)

