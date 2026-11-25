import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import AuthModal from './components/AuthModal.jsx';
import {
  Activity, ArrowDownUp, ArrowRight, BarChart3, Bell, CalendarDays, Check, ChevronDown, Clock3, Moon, Sun, Image as ImageIcon, Send,
  Compass, Download, Heart, LayoutDashboard, LogOut, MapPin, Plus, Search, ShieldCheck, MessageSquareText,
  Sparkles, Star, Ticket, Users, X
} from 'lucide-react';

const categories = ['Conference', 'Workshop', 'Meetup', 'Concert', 'Sports', 'Exhibition', 'Other'];
const blankEvent = { title: '', description: '', category: 'Conference', location: '', eventDate: '', startTime: '10:00', endTime: '', capacity: 50, price: 0, imageUrl: '', organizer: '', contactEmail: '', status: 'Published' };
const eventPayloadFields = ['title', 'description', 'category', 'location', 'eventDate', 'startTime', 'endTime', 'capacity', 'price', 'imageUrl', 'organizer', 'contactEmail', 'status'];
const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const validDate = (value) => { const date = value ? new Date(value) : null; return date && Number.isFinite(date.getTime()) ? date : null; };
const eventDate = (event) => validDate(event?.eventDate ?? event?.date);
const coverUrl = (photo) => `https://images.unsplash.com/${photo}?auto=format&fit=crop&crop=entropy&w=1600&h=900&q=85`;
function legacyCover(event) {
  const details = `${event.title || ''} ${event.category || ''}`.toLowerCase();
  if (/ceramic|potter|craft|maker/.test(details)) return coverUrl('photo-1763795258711-f4e07b4faf10');
  if (/photograph|photo walk|camera/.test(details)) return coverUrl('photo-1758987016935-1f18b9780944');
  if (/trail|marathon|run|race/.test(details)) return coverUrl('photo-1775400787690-dd70109c629b');
  if (/badminton/.test(details)) return coverUrl('photo-1723074832950-9fb031b0f4ec');
  if (/football|soccer/.test(details)) return coverUrl('photo-1777715329494-82b92bc4874f');
  if (/sport|fitness/.test(details)) return coverUrl('photo-1745790289741-12a211a8325d');
  if (/concert|music|jazz|orchestra|acoustic/.test(details)) return coverUrl('photo-1790306830782-63d4cd3ea5b0');
  if (/exhibition|gallery|art|illustration|design expo/.test(details)) return coverUrl('photo-1770747717041-069127dad7d8');
  if (/climate|green|sustainab|energy/.test(details)) return coverUrl('photo-1748615734058-1831b2af4a44');
  if (/meetup|network|founder|breakfast/.test(details)) return coverUrl('photo-1775163560631-6ff15eb2fa1f');
  if (/workshop|design|javascript|coding|code/.test(details)) return coverUrl('photo-1581091212911-f4efc3f71c48');
  return coverUrl('photo-1762968274962-20c12e6e8ecd');
}
const normalizeEvent = (event) => event ? ({ ...event, eventDate: event.eventDate ?? event.date ?? '', imageUrl: !event.eventDate && event.date ? legacyCover(event) : event.imageUrl || event.image || '', organizer: event.organizer || event.organizerName || '', contactEmail: event.contactEmail || event.organizerEmail || '' }) : event;
const dayLabel = (value) => { const date = validDate(value); return date ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : 'Date to be announced'; };
const pageForPath = (path) => ({ '/': 'discover', '/admin': 'dashboard', '/admin/events': 'events', '/admin/attendees': 'attendees', '/admin/insights': 'reports', '/admin/categories': 'categories', '/admin/inquiries': 'inquiries', '/passes': 'tickets', '/saved': 'saved', '/notifications': 'notifications', '/account': 'account' }[path] || 'discover');
const pathForPage = (page, admin) => admin ? ({ dashboard: '/admin', events: '/admin/events', attendees: '/admin/attendees', reports: '/admin/insights', categories: '/admin/categories', inquiries: '/admin/inquiries' }[page] || '/admin') : ({ discover: '/', tickets: '/passes', saved: '/saved', notifications: '/notifications', account: '/account' }[page] || '/');
const pageTitle = (section, admin) => admin ? ({ dashboard: 'Overview', events: 'Event studio', attendees: 'Guest list', reports: 'Insights', categories: 'Category catalog', inquiries: 'Inquiries' }[section] || 'Overview') : ({ discover: 'Explore events', tickets: 'My passes', saved: 'Saved events', notifications: 'Notifications', account: 'Your account' }[section] || 'Explore events');

function downloadCalendar(event) {
  const date = eventDate(event); if (!date) return;
  const start = new Date(date); const [hours, minutes] = (event.startTime || '10:00').split(':').map(Number); start.setHours(hours, minutes, 0, 0);
  const end = new Date(date); const [endHours, endMinutes] = (event.endTime || event.startTime || '11:00').split(':').map(Number); end.setHours(endHours, endMinutes, 0, 0); if (end <= start) end.setTime(start.getTime() + 60 * 60 * 1000);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = (value = '') => String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const content = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gatherly//Events//EN','BEGIN:VEVENT','UID:'+event._id+'@gatherly','DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(start),'DTEND:'+stamp(end),'SUMMARY:'+escape(event.title),'LOCATION:'+escape(event.location),'DESCRIPTION:'+escape(event.description),'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' })); link.download = (event.title || 'gatherly-event').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics'; link.click(); URL.revokeObjectURL(link.href);
}

function EventCard({ event, index, saved, onSave, onDetails, onRegister, admin, onEdit, onDelete }) {
  const percent = Math.min(100, Math.round(((event.seatsBooked || 0) / event.capacity) * 100));
  const date = eventDate(event);
  const eventEnded = date ? date < new Date() : false;
  return <article className="event-card">
    <div className={'event-image image-' + (index % 4)}>{event.imageUrl && <img className="event-cover-img" src={event.imageUrl} alt={event.title + ' cover'} loading="lazy" decoding="async" />}
      <span className="category-pill">{event.category}</span>
      {admin && <span className={'admin-card-status status-pill status-' + event.status?.toLowerCase()}>{event.status}</span>}
      {!admin && <button className={'favorite-button ' + (saved ? 'is-saved' : '')} onClick={() => onSave(event)} aria-label={saved ? 'Remove from saved events' : 'Save event'}><Heart size={15} fill={saved ? 'currentColor' : 'none'} /></button>}
      <span className="date-tile"><b>{date ? date.getDate() : '—'}</b><small>{date ? new Intl.DateTimeFormat('en', { month: 'short' }).format(date) : 'TBD'}</small></span>
      <button className="image-title" onClick={() => onDetails(event)}>{event.title}</button>
    </div>
    <div className="event-body">
      <div className="event-meta"><span><Clock3 size={13} />{event.startTime}</span><span><MapPin size={13} />{event.location}</span></div>
      <p className="event-description">{event.description}</p>
      <div className="capacity-row"><span>{event.seatsBooked || 0} / {event.capacity} attending</span><span>{event.price === 0 ? 'Free' : money(event.price)}</span></div>
      <div className="capacity-track"><i style={{ width: percent + '%' }} /></div>
      <div className="event-footer"><span className="organizer"><i>{event.organizer?.[0]}</i>{event.organizer}</span>
        <div className="card-actions">{admin && <><button className="text-action" onClick={() => onEdit(event)}>Edit</button><button className="text-action danger" onClick={() => onDelete(event)}>Delete</button></>}
          {admin ? <button className="reserve-button" onClick={() => onDetails(event)}>Details<ArrowRight size={13} /></button> : <button className="reserve-button" disabled={eventEnded || event.isFull || event.status !== 'Published'} onClick={() => onRegister(event)}>{eventEnded ? 'Ended' : event.isFull ? 'Sold out' : event.status !== 'Published' ? event.status : 'Reserve'}<ArrowRight size={13} /></button>}
        </div>
      </div>
    </div>
  </article>;
}

function Metric({ icon: Icon, label, value, foot, tone }) {
  return <article className="metric-card"><span className={'metric-icon ' + tone}><Icon size={18} /></span><div className="metric-label">{label}</div><strong>{value}</strong><small>{foot}</small></article>;
}

export default function App() {
  const navigate = useNavigate(); const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem('gatherly-token') || '');
  const [user, setUser] = useState(null);
  const [section, setSectionState] = useState(() => pageForPath(window.location.pathname));
  const [events, setEvents] = useState([]); const [stats, setStats] = useState(null); const [categoryItems, setCategoryItems] = useState(categories.map((name, sortOrder) => ({ name, sortOrder, isActive: true }))); const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [attendees, setAttendees] = useState([]); const [tickets, setTickets] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [saved, setSaved] = useState([]); const [notifications, setNotifications] = useState([]); const [unread, setUnread] = useState(0);
  const [reviews, setReviews] = useState({ items: [], summary: { average: 0, count: 0 } });
  const [testimonials, setTestimonials] = useState([]); const [theme, setTheme] = useState(localStorage.getItem('gatherly-theme') || 'light');
  const [bookingEvent, setBookingEvent] = useState(null); const [lightbox, setLightbox] = useState(null);
  const [inquiry, setInquiry] = useState({ name: '', email: '', eventId: '', guests: 20, budget: '', message: '' });
  const [query, setQuery] = useState(''); const [debouncedQuery, setDebouncedQuery] = useState(''); const [category, setCategory] = useState(''); const [status, setStatus] = useState('');
  const [sort, setSort] = useState('eventDate'); const [dateRange, setDateRange] = useState('all'); const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [authOpen, setAuthOpen] = useState(false); const [eventDialog, setEventDialog] = useState(false); const [eventDetail, setEventDetail] = useState(null);
  const [form, setForm] = useState(blankEvent); const [profileName, setProfileName] = useState(''); const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(''); const [apiReady, setApiReady] = useState(false); const [attendeeQuery, setAttendeeQuery] = useState('');
  const admin = user?.role === 'admin';
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }), [token]);
  function setSection(next, role = (admin ? 'admin' : 'user')) { setSectionState(next); navigate(pathForPage(next, role === 'admin')); }

  async function api(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = Array.isArray(data.errors) ? data.errors.map((issue) => [issue.field, issue.message].filter(Boolean).join(': ')).join(' · ') : '';
      throw new Error([data.message || 'Request failed', details].filter(Boolean).join(' '));
    }
    return data;
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '9', sortBy: sort, order: sort === 'title' ? 'asc' : 'asc' });
      if (debouncedQuery) params.set('search', debouncedQuery);
      if (category) params.set('category', category);
      if (admin && status) params.set('status', status);
      if (!admin && dateRange === 'upcoming') params.set('from', new Date().toISOString().slice(0, 10));
      if (admin && section === 'dashboard') params.set('from', new Date().toISOString().slice(0, 10));
      if (sort === 'newest') { params.set('sortBy', 'createdAt'); params.set('order', 'desc'); }
      else if (sort === 'price') { params.set('sortBy', 'price'); params.set('order', 'asc'); }
      const data = await api('/api/events?' + params);
      setEvents(data.items.map(normalizeEvent)); setPagination(data.pagination);
    } catch (error) { setToast(error.message); }
    finally { setLoading(false); }
  }

  async function loadUser() {
    if (!token) { setUser(null); return; }
    try {
      const data = await api('/api/auth/me'); setUser(data.user);
      setProfileName(data.user.name);
      if (!location.pathname.match(/^\/events\/[^/]+$/)) setSection(data.user.role === 'admin' ? 'dashboard' : 'discover', data.user.role);
      else setSectionState(data.user.role === 'admin' ? 'dashboard' : 'discover');
    } catch (_) { localStorage.removeItem('gatherly-token'); setToken(''); setUser(null); }
  }

  async function loadStats() { try { setStats(await api('/api/events/stats')); } catch (error) { setToast(error.message); } }
  async function loadCategories() { try { const data = await api('/api/categories'); setCategoryItems(data.items); } catch (error) { setToast(error.message); } }
  async function createCategory(event) { event.preventDefault(); try { await api('/api/categories', { method: 'POST', body: JSON.stringify(categoryForm) }); setCategoryForm({ name: '', description: '' }); await loadCategories(); setToast('Category added to your event catalog.'); } catch (error) { setToast(error.message); } }
  async function toggleCategory(item) { try { await api('/api/categories/' + item._id, { method: 'PATCH', body: JSON.stringify({ isActive: !item.isActive }) }); await loadCategories(); setToast(item.isActive ? 'Category archived.' : 'Category published.'); } catch (error) { setToast(error.message); } }
  async function deleteCategory(item) { if (!window.confirm('Permanently delete “' + item.name + '”?')) return; try { await api('/api/categories/' + item._id, { method: 'DELETE' }); await loadCategories(); setToast('Category deleted.'); } catch (error) { setToast(error.message); } }
  async function loadTickets() { try { const data = await api('/api/events/my-registrations'); setTickets(data.items.map(normalizeEvent)); } catch (error) { setToast(error.message); } }
  async function loadAttendees(search = attendeeQuery) {
    try { const params = new URLSearchParams(); if (search) params.set('search', search); const data = await api('/api/events/attendees?' + params); setAttendees(data.items); }
    catch (error) { setToast(error.message); }
  }
  async function loadInquiries() { try { const data = await api('/api/inquiries'); setInquiries(data.items); } catch (error) { setToast(error.message); } }
  async function updateInquiryStatus(item, status) { try { await api('/api/inquiries/' + item._id, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadInquiries(); setToast('Inquiry status updated.'); } catch (error) { setToast(error.message); } }
  async function loadFavorites() { try { const data = await api('/api/me/favorites'); setSaved(data.items.map((item) => normalizeEvent(item.event)).filter(Boolean)); } catch (error) { setToast(error.message); } }
  async function loadNotifications() { try { const data = await api('/api/me/notifications'); setNotifications(data.items); setUnread(data.unread); } catch (error) { setToast(error.message); } }
  async function loadReviews(eventId) { try { setReviews(await api('/api/events/' + eventId + '/reviews')); } catch (error) { setToast(error.message); } }

  function openDetails(event) { setEventDetail(normalizeEvent(event)); navigate('/events/' + event._id); }
  function closeDetails() { setEventDetail(null); navigate(pathForPage(section, admin)); }

  useEffect(() => { loadUser(); }, [token]);
  useEffect(() => { loadCategories(); }, [admin]);
  useEffect(() => { api('/api/reviews/featured').then((data) => setTestimonials(data.items || [])).catch(() => {}); }, []);
  useEffect(() => { localStorage.setItem('gatherly-theme', theme); }, [theme]);
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 240); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { if (user) setInquiry((current) => ({ ...current, name: current.name || user.name, email: current.email || user.email })); }, [user]);
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key !== 'Escape') return; if (lightbox) setLightbox(null); else if (bookingEvent) setBookingEvent(null); else if (authOpen) setAuthOpen(false); else if (eventDetail) closeDetails(); };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox, bookingEvent, authOpen, eventDetail]);
  useEffect(() => {
    document.title = eventDetail ? eventDetail.title + ' | Gatherly' : pageTitle(section, admin) + ' | Gatherly';
    const description = eventDetail?.description || 'Discover thoughtful events, save your favorites, and keep every reservation in one place with Gatherly.';
    const meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', description.slice(0, 155));
  }, [eventDetail, section, admin]);
  useEffect(() => {
    const eventRoute = location.pathname.match(/^\/events\/([^/]+)$/);
    if (eventRoute) {
      if (eventDetail?._id !== eventRoute[1]) api('/api/events/' + eventRoute[1]).then((event) => setEventDetail(normalizeEvent(event))).catch((error) => setToast(error.message));
      return;
    }
    setEventDetail(null); setSectionState(pageForPath(location.pathname));
  }, [location.pathname]);
  useEffect(() => {
    if (location.pathname.startsWith('/admin') && !token) { navigate('/'); return; }
    if (user?.role === 'admin' && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/events/')) setSection('dashboard', 'admin');
    if (user && user.role !== 'admin' && location.pathname.startsWith('/admin')) setSection('discover', 'user');
  }, [user, token, location.pathname]);
  useEffect(() => { loadEvents(); }, [debouncedQuery, category, status, sort, dateRange, page, admin, section]);
  useEffect(() => { if (admin) loadStats(); }, [admin]);
  useEffect(() => { if ((section === 'tickets' || section === 'account') && token) loadTickets(); }, [section, token]);
  useEffect(() => { if (token && !admin) { loadFavorites(); loadNotifications(); } }, [token, admin]);
  useEffect(() => { if (section === 'notifications' && token) loadNotifications(); }, [section, token]);
  useEffect(() => { if (eventDetail?._id) { loadReviews(eventDetail._id); if (token) loadTickets(); } }, [eventDetail?._id, token]);
  useEffect(() => { if (section === 'attendees' && admin) loadAttendees(); }, [section, admin]);
  useEffect(() => { if (section === 'inquiries' && admin) loadInquiries(); }, [section, admin]);
  useEffect(() => {
    let active = true;
    const checkHealth = async () => { try { const response = await fetch('/api/health'); const data = await response.json(); if (active) setApiReady(response.ok && data.database === 'connected'); } catch (_) { if (active) setApiReady(false); } };
    checkHealth(); const timer = setInterval(checkHealth, 30000); return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); } }, [toast]);

  function handleAuthenticated(result) {
    localStorage.setItem('gatherly-token', result.token); setToken(result.token); setUser(result.user); setAuthOpen(false);
    setProfileName(result.user.name); setSection(result.user.role === 'admin' ? 'dashboard' : 'discover', result.user.role); setToast('Welcome, ' + result.user.name + '.');
  }

  async function submitEvent(event) {
    event.preventDefault(); setBusy(true); const editing = Boolean(form._id);
    const payload = Object.fromEntries(eventPayloadFields.map((key) => [key, form[key]]).filter(([, value]) => value !== undefined));
    payload.capacity = Number(payload.capacity); payload.price = Number(payload.price || 0);
    try {
      await api('/api/events' + (editing ? '/' + form._id : ''), { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setEventDialog(false); setToast(editing ? 'Event updated.' : 'Event created.'); await loadEvents(); await loadStats();
    } catch (error) { setToast(error.message); }
    finally { setBusy(false); }
  }

  async function register(event) {
    if (!token) { setAuthOpen(true); setToast('Sign in to reserve your place.'); return; }
    setBookingEvent(event);
  }
  async function confirmBooking(event) {
    event.preventDefault(); if (!bookingEvent) return; setBusy(true);
    try { await api('/api/events/' + bookingEvent._id + '/registrations', { method: 'POST' }); setToast('Your place is confirmed. Your QR pass is ready.'); setBookingEvent(null); await loadEvents(); await loadTickets(); await loadStats(); }
    catch (error) { setToast(error.message); }
    finally { setBusy(false); }
  }

  async function submitInquiry(event) {
    event.preventDefault(); setBusy(true);
    try { const result = await api('/api/inquiries', { method: 'POST', body: JSON.stringify({ ...inquiry, guests: Number(inquiry.guests) }) }); setToast(result.message); setInquiry({ name: user?.name || '', email: user?.email || '', eventId: '', guests: 20, budget: '', message: '' }); }
    catch (error) { setToast(error.message); }
    finally { setBusy(false); }
  }

  async function cancelTicket(event) {
    try { await api('/api/events/' + event._id + '/registrations/me', { method: 'DELETE' }); setToast('Reservation cancelled.'); await loadTickets(); await loadEvents(); await loadStats(); }
    catch (error) { setToast(error.message); }
  }

  async function removeEvent(event) {
    if (!window.confirm('Delete “' + event.title + '”?')) return;
    try { await api('/api/events/' + event._id, { method: 'DELETE' }); setToast('Event deleted.'); await loadEvents(); await loadStats(); }
    catch (error) { setToast(error.message); }
  }

  async function toggleSaved(event) {
    if (!token) { setAuthOpen(true); setToast('Sign in to keep a saved list across devices.'); return; }
    try {
      const isSaved = saved.some((item) => item._id === event._id);
      await api('/api/me/favorites/' + event._id, { method: isSaved ? 'DELETE' : 'PUT' });
      await loadFavorites(); setToast(isSaved ? 'Removed from your saved list.' : 'Saved for later.');
    } catch (error) { setToast(error.message); }
  }
  function editEvent(event) { const date = eventDate(event); setForm({ ...event, eventDate: date ? date.toISOString().slice(0, 10) : '' }); setEventDialog(true); }
  function logout() { localStorage.removeItem('gatherly-token'); setToken(''); setUser(null); setStats(null); setSection('discover', 'user'); setToast('You have signed out.'); }

  async function saveProfile(event) {
    event.preventDefault();
    try { const result = await api('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ name: profileName }) }); setUser(result.user); setToast('Profile updated.'); }
    catch (error) { setToast(error.message); }
  }
  async function submitReview(event) {
    event.preventDefault();
    try { await api('/api/events/' + eventDetail._id + '/reviews', { method: 'POST', body: JSON.stringify(reviewForm) }); setReviewForm({ rating: 5, comment: '' }); await loadReviews(eventDetail._id); setToast('Thanks for sharing your experience.'); }
    catch (error) { setToast(error.message); }
  }
  async function markNotification(item) {
    if (item.readAt) return;
    try { await api('/api/me/notifications/' + item._id + '/read', { method: 'PATCH' }); await loadNotifications(); }
    catch (error) { setToast(error.message); }
  }
  async function markAllNotifications() {
    try { await api('/api/me/notifications/read-all', { method: 'PATCH' }); await loadNotifications(); setToast('Inbox cleared.'); }
    catch (error) { setToast(error.message); }
  }

  const title = pageTitle(section, admin);
  const shownEvents = section === 'saved' ? saved : events;

  return <div className={'app-shell ' + (admin ? 'role-admin' : 'role-customer') + (theme === 'dark' ? ' theme-dark' : '')}>
    <a className="skip-link" href="#home">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); setSection(admin ? 'dashboard' : 'discover'); }}><span className="brand-mark"><Sparkles size={18} /></span>gatherly<span className="brand-dot">.</span></a>
      <div className="workspace"><span className="workspace-avatar">{admin ? 'A' : 'G'}</span><span><b>{admin ? 'Gatherly Admin' : 'Gatherly Studio'}</b><small>{admin ? 'Operations console' : 'Find your next moment'}</small></span><ChevronDown size={14} /></div>
      <span className="nav-label">{admin ? 'MANAGEMENT' : 'YOUR GATHERLY'}</span>
      <nav className="navigation">
        {(admin ? [
          [LayoutDashboard, 'dashboard', 'Overview'], [CalendarDays, 'events', 'Events'], [Sparkles, 'categories', 'Categories'], [MessageSquareText, 'inquiries', 'Inquiries'], [Users, 'attendees', 'Attendees'], [BarChart3, 'reports', 'Insights']
        ] : [
          [Compass, 'discover', 'Discover'], [Ticket, 'tickets', 'My passes'], [Heart, 'saved', 'Saved events'], [Bell, 'notifications', 'Notifications'], [ShieldCheck, 'account', 'Account']
        ]).map(([Icon, key, label]) => <button key={key} className={'nav-item ' + (section === key ? 'active' : '')} onClick={() => setSection(key)}><Icon size={17} />{label}{key === 'events' && <span className="nav-count">{pagination.total}</span>}{key === 'saved' && <span className="nav-count">{saved.length}</span>}{key === 'notifications' && unread > 0 && <span className="nav-count unread-count">{unread}</span>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><span>{admin ? <Activity size={16} /> : <Sparkles size={16} />}</span><b>{admin ? 'Live event operations' : 'Make room for a good time'}</b><p>{admin ? 'Manage listings, guests and performance from one place.' : 'Thoughtfully picked experiences, all in one place.'}</p></div>
        {user ? <button className="user-chip" onClick={logout}><span className="user-avatar">{user.name[0].toUpperCase()}</span><span><b>{user.name}</b><small>{admin ? 'Administrator' : 'Member account'}</small></span><LogOut size={15} /></button> : <button className="sidebar-login" onClick={() => setAuthOpen(true)}>Sign in to your account <ArrowRight size={14} /></button>}
      </div>
    </aside>

    <main className="main-content" id="home">
      <header className="topbar"><div className="breadcrumbs">{admin ? 'Operations' : 'Gatherly'} <span>/</span> <b>{title}</b></div><div className="topbar-actions"><span className="live-indicator"><i className={apiReady ? 'system-online' : 'system-offline'} />{apiReady ? 'Live data' : 'Database offline'}</span><button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>{token && !admin && <button className="notification-shortcut" onClick={() => setSection('notifications')} aria-label="Notifications"><Bell size={15} />{unread > 0 && <i>{unread}</i>}</button>}{!user && <button className="button button-primary button-small" onClick={() => setAuthOpen(true)}>Sign in</button>}</div></header>

      {admin ? <>
        {section === 'dashboard' && <>
          <section className="welcome-row"><div><div className="eyebrow"><i /> OPERATIONS CENTER</div><h1>Good morning, {user?.name?.split(' ')[0] || 'Organizer'}.</h1><p>Your events at a glance. Keep the details moving and the guests coming.</p></div><div className="welcome-actions"><button className="button button-quiet" onClick={() => { loadEvents(); loadStats(); }}><ArrowDownUp size={15} /> Refresh</button><button className="button button-primary" onClick={() => { setForm({ ...blankEvent }); setEventDialog(true); }}><Plus size={16} /> Create event</button></div></section>
          {stats && <section className="metrics"><Metric icon={CalendarDays} label="Total events" value={stats.totalEvents} foot="All statuses" tone="mint" /><Metric icon={Activity} label="Upcoming" value={stats.upcoming} foot="Published on the calendar" tone="blue" /><Metric icon={Users} label="Seats booked" value={stats.seatsBooked} foot="Confirmed guests" tone="violet" /><Metric icon={Ticket} label="Ticket revenue" value={money(stats.revenue)} foot="Across published events" tone="amber" /></section>}
          <div className="admin-overview-grid"><section className="workspace-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-muted">UP NEXT</span><h2>Events to watch</h2></div><button className="text-link" onClick={() => setSection('events')}>View all <ArrowRight size={13} /></button></div>
              {events.slice(0, 5).map((event) => { const date = eventDate(event); return <div className="admin-event-row" key={event._id}><span className="mini-date"><b>{date ? date.getDate() : '—'}</b><small>{date ? new Intl.DateTimeFormat('en', { month: 'short' }).format(date) : 'TBD'}</small></span><span className="admin-row-main"><b>{event.title}</b><small>{event.location} · {event.category}</small></span><span className={'status-pill status-' + event.status?.toLowerCase()}>{event.status}</span><span className="admin-row-count"><Users size={13} />{event.seatsBooked || 0}/{event.capacity}</span><button className="row-more" onClick={() => editEvent(event)}>Edit</button></div>; })}
              {!events.length && <div className="panel-empty">Create your first event to start building your calendar.</div>}
            </section>
            <section className="workspace-panel chart-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-muted">LAST 7 DAYS</span><h2>Registration pulse</h2></div><span className="chart-total">{(stats?.bookingTrend || []).reduce((sum, item) => sum + item.total, 0)}<small> bookings</small></span></div>
              <div className="bar-chart">{(stats?.bookingTrend || []).length ? stats.bookingTrend.map((item) => { const date = validDate(item._id + 'T12:00:00'); return <div className="bar-column" key={item._id}><span className="bar-value">{item.total}</span><i style={{ height: (Math.max(12, item.total / Math.max(...stats.bookingTrend.map((point) => point.total), 1) * 100)) + '%' }} /><small>{date ? new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date) : '—'}</small></div>; }) : <div className="chart-empty">New registrations will show up here as they arrive.</div>}</div>
              <div className="category-breakdown"><h3>Events by category</h3>{(stats?.categories || []).slice(0, 4).map((item) => <div className="category-line" key={item._id}><span>{item._id}</span><div><i style={{ width: Math.max(8, item.events / Math.max(stats.totalEvents, 1) * 100) + '%' }} /></div><b>{item.events}</b></div>)}</div>
            </section></div>
        </>}

        {section === 'events' && <>
          <section className="page-intro"><div><div className="eyebrow"><i /> EVENT MANAGEMENT</div><h1>Your event studio</h1><p>Build the calendar, tune listings, and keep every event on track.</p></div><button className="button button-primary" onClick={() => { setForm({ ...blankEvent }); setEventDialog(true); }}><Plus size={16} /> New event</button></section>
          <EventToolbar query={query} setQuery={(v) => { setPage(1); setQuery(v); }} category={category} setCategory={setCategory} sort={sort} setSort={setSort} status={status} setStatus={setStatus} admin categories={categoryItems.filter((item) => item.isActive).map((item) => item.name)} />
          <div className="event-grid">{events.map((event, index) => <EventCard key={event._id} event={event} index={index} saved={false} onSave={() => {}} onDetails={openDetails} onRegister={register} admin onEdit={editEvent} onDelete={removeEvent} />)}</div>
          {!events.length && <EmptyState loading={loading} clear={() => { setQuery(''); setCategory(''); setStatus(''); }} />}
          <Pager page={page} pagination={pagination} setPage={setPage} />
        </>}

        {section === 'attendees' && <>
          <section className="page-intro"><div><div className="eyebrow"><i /> GUEST RELATIONSHIPS</div><h1>Everyone in the room</h1><p>Search registrations across your events and keep guest details close.</p></div><button className="button button-quiet" onClick={() => downloadAttendees(attendees)}><Download size={15} /> Export CSV</button></section>
          <div className="table-toolbar"><label className="search-box"><Search size={15} /><input value={attendeeQuery} onChange={(e) => setAttendeeQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadAttendees(attendeeQuery)} placeholder="Search guests or events" /></label><button className="button button-quiet" onClick={() => loadAttendees(attendeeQuery)}>Search</button><span>{attendees.length} registrations</span></div>
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>GUEST</th><th>EVENT</th><th>EVENT DATE</th><th>REGISTERED</th><th>LOCATION</th></tr></thead><tbody>{attendees.map((attendee) => <tr key={attendee._id}><td><span className="guest-name"><i>{attendee.name?.[0]?.toUpperCase()}</i><span><b>{attendee.name}</b><small>{attendee.email}</small></span></span></td><td>{attendee.event.title}</td><td>{dayLabel(attendee.event.eventDate)}</td><td>{dayLabel(attendee.registeredAt)}</td><td>{attendee.event.location}</td></tr>)}</tbody></table>{!attendees.length && <div className="panel-empty">No registrations match this search yet.</div>}</div>
        </>}

        {section === 'categories' && <>
          <section className="page-intro"><div><div className="eyebrow"><i /> EVENT TAXONOMY</div><h1>Category catalog</h1><p>Manage the categories customers can browse and organizers can assign.</p></div><span className="status-pill status-published">{categoryItems.filter((item) => item.isActive).length} active</span></section>
          <section className="category-admin-layout"><form className="workspace-panel category-create" onSubmit={createCategory}><span className="eyebrow eyebrow-muted">GROW YOUR CATALOG</span><h2>Add a category</h2><label>Name<input required minLength="2" maxLength="40" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="e.g. Food & drink" /></label><label>Description<input maxLength="240" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} placeholder="What kind of events belong here?" /></label><button className="button button-primary"><Plus size={15} /> Add category</button></form><div className="workspace-panel category-list-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-muted">MONGODB COLLECTION</span><h2>All categories</h2></div><button className="text-link" onClick={loadCategories}><ArrowDownUp size={14} /> Refresh</button></div><div className="managed-categories">{categoryItems.map((item) => <article className="managed-category" key={item._id || item.name}><span className="highlight-icon"><Sparkles size={15} /></span><span className="managed-category-copy"><b>{item.name}</b><small>{item.description || 'Available for event listings and discovery filters'}</small></span><span className={'status-pill ' + (item.isActive ? 'status-published' : 'status-cancelled')}>{item.isActive ? 'Active' : 'Archived'}</span><button className="text-action" onClick={() => toggleCategory(item)}>{item.isActive ? 'Archive' : 'Publish'}</button><button className="text-action danger" onClick={() => deleteCategory(item)}>Delete</button></article>)}</div></div></section>
        </>}

        {section === 'inquiries' && <>
          <section className="page-intro"><div><div className="eyebrow"><i /> PRIVATE EVENTS & SUPPORT</div><h1>Inquiry inbox</h1><p>Review event requests and keep every conversation moving.</p></div><button className="button button-quiet" onClick={loadInquiries}><ArrowDownUp size={14} /> Refresh</button></section>
          <div className="inquiry-admin-list">{inquiries.map((item) => <article className="workspace-panel inquiry-admin-card" key={item._id}><div className="inquiry-admin-top"><div><span className="eyebrow eyebrow-muted">{item.event?.title || 'Private event request'}</span><h2>{item.name}</h2><a href={'mailto:' + item.email}>{item.email}</a></div><select value={item.status} onChange={(event) => updateInquiryStatus(item, event.target.value)} aria-label={'Status for inquiry from ' + item.name}><option>New</option><option>In progress</option><option>Quoted</option><option>Closed</option></select></div><p>{item.message}</p><div className="inquiry-admin-meta"><span>{item.guests} guests</span><span>{item.budget || 'Budget flexible'}</span><span>{new Date(item.createdAt).toLocaleDateString()}</span></div></article>)}{!inquiries.length && <div className="empty-state"><span><MessageSquareText size={22} /></span><h3>Your inbox is clear</h3><p>New customer event requests will appear here.</p></div>}</div>
        </>}

        {section === 'reports' && <>
          <section className="page-intro"><div><div className="eyebrow"><i /> PERFORMANCE</div><h1>Insights that move you</h1><p>Understand demand and make the next event even better.</p></div><span className="report-updated">Updated just now <i /></span></section>
          {stats && <section className="metrics"><Metric icon={CalendarDays} label="Events listed" value={stats.totalEvents} foot="Across all statuses" tone="mint" /><Metric icon={Users} label="Total registrations" value={stats.seatsBooked} foot="Guest seats reserved" tone="blue" /><Metric icon={Ticket} label="Average ticket" value={stats.seatsBooked ? money(stats.revenue / stats.seatsBooked) : money(0)} foot="Per registration" tone="violet" /><Metric icon={Activity} label="Upcoming events" value={stats.upcoming} foot="Published in the future" tone="amber" /></section>}
          <section className="workspace-panel reports-panel"><div className="panel-heading"><div><span className="eyebrow eyebrow-muted">CATEGORY PERFORMANCE</span><h2>Demand by category</h2></div></div><div className="report-bars">{(stats?.categories || []).map((item, index) => <div className="report-bar-row" key={item._id}><span>{item._id}</span><div className="report-track"><i className={'report-fill tone-' + (index % 4)} style={{ width: Math.max(3, item.events / Math.max(stats.totalEvents, 1) * 100) + '%' }} /></div><b>{item.events} events</b><small>{item.bookings} guests</small></div>)}</div></section>
        </>}
      </> : <>
        {section === 'discover' && <>
          <section className="customer-hero cinematic-hero" style={events[0]?.imageUrl ? { backgroundImage: 'linear-gradient(90deg,rgba(8,20,25,.88),rgba(8,20,25,.52) 55%,rgba(8,20,25,.2)),url(' + events[0].imageUrl + ')' } : {}}><div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" /><div className="hero-copy"><span className="eyebrow"><i /> FIND YOUR NEXT MOMENT</span><h1>Make the calendar<br />worth looking forward to.</h1><p>Small rooms. Big ideas. Nights you’ll talk about later.</p><button className="button button-light" onClick={() => document.getElementById('event-discovery')?.scrollIntoView({ behavior: 'smooth' })}>Explore what’s on <ArrowRight size={15} /></button><a className="hero-inquiry-link" href="#event-inquiry">Planning a private event? Talk with us <ArrowRight size={13} /></a></div><div className="hero-stamp"><Sparkles size={22} /><b>Good plans<br />start here</b><span>Curated for you</span></div><span className="hero-index">GATHERLY · EXPERIENCES, WELL ARRANGED</span></section>
          <section className="category-discovery" aria-label="Browse event categories"><div><span className="eyebrow eyebrow-muted">A GOOD PLACE TO START</span><h2>What are you in the mood for?</h2></div><div className="category-chips">{['All experiences', ...categoryItems.filter((item) => item.isActive).map((item) => item.name)].map((item) => <button key={item} className={(!category && item === 'All experiences') || category === item ? 'selected' : ''} onClick={() => { setPage(1); setCategory(item === 'All experiences' ? '' : item); document.getElementById('event-discovery')?.scrollIntoView({ behavior: 'smooth' }); }}>{item}</button>)}</div></section>
          <section className="customer-highlights"><div><span className="highlight-icon"><Compass size={16} /></span><span><b>{pagination.total} live experiences</b><small>Find something worth leaving home for</small></span></div><div><span className="highlight-icon"><ShieldCheck size={16} /></span><span><b>Easy reservations</b><small>Your passes stay in one place</small></span></div><div><span className="highlight-icon"><Heart size={16} /></span><span><b>Save your shortlist</b><small>Come back when you’re ready</small></span></div></section>
          {events.length > 0 && <section className="gallery-section"><div className="section-heading"><div><span className="eyebrow eyebrow-muted">A FEEL FOR THE ROOM</span><h2>Moments worth making</h2></div><span className="gallery-note"><ImageIcon size={14} /> A little inspiration</span></div><div className="moment-gallery">{events.slice(0, 5).map((item, index) => <button key={item._id} className={'gallery-tile gallery-tile-' + index} onClick={() => setLightbox(item)} aria-label={'Open gallery image for ' + item.title} style={item.imageUrl ? { backgroundImage: 'linear-gradient(180deg,transparent 35%,rgba(8,18,30,.72)),url(' + item.imageUrl + ')' } : {}}><span>{item.category}</span><b>{item.title}</b></button>)}</div></section>}
          <section className="event-section" id="event-discovery"><div className="section-heading"><div><span className="eyebrow eyebrow-muted">HANDPICKED FOR YOUR CALENDAR</span><h2>Find your people</h2><p>{pagination.total} experiences waiting</p></div><EventToolbar query={query} setQuery={(v) => { setPage(1); setQuery(v); }} category={category} setCategory={setCategory} sort={sort} setSort={setSort} dateRange={dateRange} setDateRange={setDateRange} categories={categoryItems.filter((item) => item.isActive).map((item) => item.name)} /></div>
            {events.length ? <div className="event-grid">{events.map((event, index) => <EventCard key={event._id} event={event} index={index} saved={saved.some((item) => item._id === event._id)} onSave={toggleSaved} onDetails={openDetails} onRegister={register} admin={false} />)}</div> : <EmptyState loading={loading} clear={() => { setQuery(''); setCategory(''); setDateRange('all'); }} />}
            <Pager page={page} pagination={pagination} setPage={setPage} />
          </section>
          <section className="testimonial-section"><div className="testimonial-intro"><span className="eyebrow eyebrow-muted">{testimonials.length ? 'GOOD WORDS, REAL GUESTS' : 'OUR APPROACH'}</span><h2>{testimonials.length ? 'People remember how it made them feel.' : 'Thoughtful events start here.'}</h2><p>{testimonials.length ? 'Notes from guests who’ve been there.' : 'Discover experiences made to bring good people together.'}</p></div><div className="testimonial-grid">{testimonials.length ? testimonials.slice(0, 3).map((item) => <article className="testimonial-card" key={item._id}><div className="testimonial-stars" aria-label={item.rating + ' out of 5 stars'}>{'★'.repeat(item.rating)}</div><blockquote>“{item.comment}”</blockquote><div className="testimonial-by"><span>{item.user?.name?.[0]?.toUpperCase() || 'G'}</span><div><b>{item.user?.name || 'Gatherly guest'}</b><small>{item.event?.title || 'Gatherly experience'}</small></div></div></article>) : <article className="testimonial-card testimonial-empty"><span className="testimonial-promise-icon"><Sparkles size={18} /></span><h3>Make room for a good time.</h3><p>Explore upcoming experiences, keep your shortlist close, and let us help with the bigger plans.</p><button className="text-link" onClick={() => document.getElementById('event-discovery')?.scrollIntoView({ behavior: 'smooth' })}>Explore the calendar <ArrowRight size={14} /></button></article>}</div></section>
          <section className="inquiry-section" id="event-inquiry"><div className="inquiry-copy"><span className="eyebrow"><i /> FOR THE BIGGER PLANS</span><h2>Let’s make a gathering feel like yours.</h2><p>Tell us a little about the occasion. Our team can help you find the right experience or plan something private.</p><div className="inquiry-points"><span><Check size={15} /> Thoughtful recommendations</span><span><Check size={15} /> Groups of every size</span><span><Check size={15} /> A real person to help</span></div></div><form className="inquiry-form" onSubmit={submitInquiry}><div className="inquiry-form-heading"><span className="eyebrow eyebrow-muted">START A CONVERSATION</span><h3>Tell us what you’re planning</h3></div><div className="inquiry-fields"><label>Your name<input autoComplete="name" required minLength="2" maxLength="80" value={inquiry.name} onChange={(event) => setInquiry({ ...inquiry, name: event.target.value })} /></label><label>Email address<input type="email" autoComplete="email" required value={inquiry.email} onChange={(event) => setInquiry({ ...inquiry, email: event.target.value })} /></label><label>Event you’re interested in<select value={inquiry.eventId} onChange={(event) => setInquiry({ ...inquiry, eventId: event.target.value })}><option value="">I’m open to ideas</option>{events.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select></label><label>Group size<input type="number" min="1" max="10000" value={inquiry.guests} onChange={(event) => setInquiry({ ...inquiry, guests: event.target.value })} /></label><label className="inquiry-full">Budget range (optional)<input value={inquiry.budget} maxLength="80" onChange={(event) => setInquiry({ ...inquiry, budget: event.target.value })} placeholder="e.g. ₹25,000–₹50,000" /></label><label className="inquiry-full">A few details<textarea required minLength="10" maxLength="1500" value={inquiry.message} onChange={(event) => setInquiry({ ...inquiry, message: event.target.value })} placeholder="Date, occasion, or anything else we should know" /></label></div><button className="button button-primary" disabled={busy}><Send size={15} /> Send inquiry <ArrowRight size={15} /></button><small className="inquiry-privacy">Your details are only used to reply to this request.</small></form></section>
        </>}
        {section === 'saved' && <><section className="page-intro"><div><div className="eyebrow"><i /> YOUR SHORTLIST</div><h1>Saved for later</h1><p>Keep the events you’re thinking about close by, synced to your account.</p></div></section>{shownEvents.length ? <div className="event-grid">{shownEvents.map((event, index) => <EventCard key={event._id} event={event} index={index} saved onSave={toggleSaved} onDetails={openDetails} onRegister={register} admin={false} />)}</div> : <EmptyState saved clear={() => setSection('discover')} />}</>}
        {section === 'tickets' && <><section className="page-intro"><div><div className="eyebrow"><i /> YOUR PLANS</div><h1>My passes</h1><p>Your confirmed places, all in one handy list.</p></div><button className="button button-quiet" onClick={loadTickets}><ArrowDownUp size={14} /> Refresh</button></section><div className="ticket-grid">{tickets.map((ticket) => <article className="pass-card" key={ticket._id}><div className="pass-top"><span className="pass-icon"><Ticket size={18} /></span><span className={'status-pill ' + (ticket.checkedInAt ? 'status-cancelled' : 'status-published')}>{ticket.checkedInAt ? 'CHECKED IN' : 'CONFIRMED'}</span></div><div className="pass-main"><div><h2>{ticket.title}</h2><p>{ticket.description}</p><div className="pass-meta"><span><CalendarDays size={14} />{dayLabel(ticket.eventDate)}</span><span><Clock3 size={14} />{ticket.startTime}</span><span><MapPin size={14} />{ticket.location}</span></div></div>{ticket.ticketCode && <div className="pass-qr"><QRCodeSVG value={ticket.ticketCode} size={88} level="M" includeMargin aria-label={'Check-in QR for ' + ticket.title} /><small>Show at entry</small></div>}</div><div className="pass-footer"><span>Booked under <b>{user?.name}</b></span><div><button className="text-action" onClick={() => downloadCalendar(ticket)}><CalendarDays size={13} /> Add to calendar</button><button className="text-action danger" onClick={() => cancelTicket(ticket)}>Cancel reservation</button></div></div></article>)}{!tickets.length && <EmptyState tickets clear={() => setSection('discover')} />}</div></>}
        {section === 'notifications' && <><section className="page-intro"><div><div className="eyebrow"><i /> YOUR ACTIVITY</div><h1>Notifications</h1><p>Booking confirmations, event reminders, and account updates, all in one place.</p></div>{unread > 0 && <button className="button button-quiet" onClick={markAllNotifications}>Mark all read</button>}</section><div className="notification-list">{notifications.map((item) => <button className={'notification-card ' + (!item.readAt ? 'is-unread' : '')} key={item._id} onClick={() => markNotification(item)}><span className="notification-icon">{item.type === 'event_reminder' ? <CalendarDays size={16} /> : <Bell size={16} />}</span><span className="notification-copy"><b>{item.title}</b><small>{item.message}</small><i>{new Date(item.createdAt).toLocaleString()}</i></span>{!item.readAt && <span className="notification-dot" />}</button>)}{!notifications.length && <EmptyState saved clear={() => setSection('discover')} />}</div></>}
        {section === 'account' && <section className="account-card"><div className="account-avatar">{user?.name?.[0]?.toUpperCase() || 'G'}</div><span className="eyebrow eyebrow-muted">YOUR GATHERLY ACCOUNT</span><h1>{user?.name || 'Welcome, guest'}</h1><p>{user?.email || 'Sign in or create an account to save events and keep your passes together.'}</p><div className="account-stats"><span><b>{tickets.length}</b><small>passes</small></span><span><b>{saved.length}</b><small>saved events</small></span><span><b>{unread}</b><small>unread</small></span></div>{user ? <><form className="profile-form" onSubmit={saveProfile}><label>Display name<input value={profileName} minLength="2" maxLength="80" onChange={(event) => setProfileName(event.target.value)} /></label><label>Email address<input value={user.email} disabled /></label><button className="button button-primary">Save profile <Check size={14} /></button></form><button className="button button-quiet" onClick={logout}><LogOut size={15} /> Sign out</button></> : <button className="button button-primary" onClick={() => setAuthOpen(true)}>Sign in or join <ArrowRight size={15} /></button>}</section>}
      </>}
      <footer className="footer"><span>© 2026 Gatherly</span><span>Curated experiences, better together <Sparkles size={12} /></span></footer>
    </main>

    {authOpen && <AuthModal request={api} onClose={() => setAuthOpen(false)} onAuthenticated={handleAuthenticated} />}

    {bookingEvent && <div className="modal-backdrop" onClick={() => setBookingEvent(null)}><form role="dialog" aria-modal="true" aria-labelledby="booking-title" className="booking-modal" onSubmit={confirmBooking} onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow eyebrow-muted">RESERVATION</span><h2 id="booking-title">Make it official</h2><p>Your pass will be saved to your account.</p></div><button type="button" className="modal-close" onClick={() => setBookingEvent(null)} aria-label="Close reservation"><X size={17} /></button></div><div className="booking-event-summary"><span className="pass-icon"><Ticket size={17} /></span><div><b>{bookingEvent.title}</b><small>{dayLabel(bookingEvent.eventDate)} · {bookingEvent.location}</small></div><strong>{bookingEvent.price === 0 ? 'Free' : money(bookingEvent.price)}</strong></div><div className="booking-identity"><label>Name<input value={user?.name || ''} readOnly /></label><label>Email<input value={user?.email || ''} readOnly /></label></div><label className="booking-consent"><input type="checkbox" required /> I confirm this reservation for one attendee.</label><button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Confirming…' : 'Confirm reservation'}<ArrowRight size={15} /></button><small className="inquiry-privacy">No payment is collected by this demo reservation.</small></form></div>}
    {lightbox && <div className="lightbox-backdrop" onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label="Event image gallery"><button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Close gallery"><X size={21} /></button><figure className={'lightbox-frame image-' + (Math.max(0, categories.indexOf(lightbox.category)) % 4)} onClick={(event) => event.stopPropagation()}>{lightbox.imageUrl ? <img src={lightbox.imageUrl} alt={lightbox.title + ' event gallery'} /> : <div className="lightbox-placeholder" />}<figcaption><span>{lightbox.category}</span><b>{lightbox.title}</b><small>{lightbox.location}</small></figcaption></figure></div>}
    {eventDialog && <div className="modal-backdrop" onClick={() => setEventDialog(false)}><form className="event-modal" onSubmit={submitEvent} onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow eyebrow-muted">EVENT STUDIO</span><h2>{form._id ? 'Update event' : 'Create an event'}</h2></div><button type="button" className="modal-close" onClick={() => setEventDialog(false)}><X size={17} /></button></div><EventForm form={form} setForm={setForm} busy={busy} onCancel={() => setEventDialog(false)} categories={categoryItems.filter((item) => item.isActive).map((item) => item.name)} /></form></div>}
    {eventDetail && <div className="modal-backdrop" onClick={closeDetails}><article className="detail-modal" onClick={(event) => event.stopPropagation()}><div className={'detail-cover image-' + (Math.max(0, categories.indexOf(eventDetail.category)) % 4)} style={eventDetail.imageUrl ? { backgroundImage: 'linear-gradient(180deg,transparent 20%,rgba(9,16,29,.75)),url(' + eventDetail.imageUrl + ')' } : {}}><button className="modal-close detail-close" onClick={closeDetails} aria-label="Close event details"><X size={17} /></button><span className="category-pill">{eventDetail.category}</span><h2>{eventDetail.title}</h2></div><div className="detail-content"><div className="detail-facts"><span><CalendarDays size={15} />{dayLabel(eventDetail.eventDate ?? eventDetail.date)}</span><span><Clock3 size={15} />{eventDetail.startTime}{eventDetail.endTime ? ' – ' + eventDetail.endTime : ''}</span><span><MapPin size={15} />{eventDetail.location}</span></div><p>{eventDetail.description}</p><div className="detail-actions"><button className="button button-quiet" onClick={() => downloadCalendar(eventDetail)}><CalendarDays size={14} /> Add to calendar</button><a className="button button-quiet" href="#event-inquiry" onClick={closeDetails}>Ask about this event <ArrowRight size={14} /></a></div><div className="detail-bottom"><span><b>{eventDetail.seatsRemaining}</b> places left · {eventDetail.price === 0 ? 'Free entry' : money(eventDetail.price)}</span>{!admin && eventDetail.status === 'Published' && (eventDate(eventDetail) && eventDate(eventDetail) >= new Date()) && <button className="button button-primary" onClick={() => register(eventDetail)}>Reserve a place <ArrowRight size={15} /></button>}</div><section className="reviews-section"><div className="review-heading"><div><span className="eyebrow eyebrow-muted">COMMUNITY NOTES</span><h3>Guest reviews</h3></div><span className="review-average"><Star size={15} fill="currentColor" /> {reviews.summary.average.toFixed(1)} <small>({reviews.summary.count})</small></span></div>{reviews.items.map((review) => <article className="review-row" key={review._id}><span className="review-avatar">{review.user?.name?.[0]?.toUpperCase() || 'G'}</span><div><b>{review.user?.name || 'Gatherly guest'}</b><span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p>{review.comment}</p></div></article>)}{!reviews.items.length && <p className="review-empty">No reviews yet. Be the first guest to share how it went.</p>}{user && !admin && tickets.some((ticket) => ticket._id === eventDetail._id) && (eventDate(eventDetail) && eventDate(eventDetail) < new Date()) && !reviews.items.some((review) => review.user?._id === user.id) && <form className="review-form" onSubmit={submitReview}><label>Your rating<select value={reviewForm.rating} onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}><option value="5">★★★★★ — Loved it</option><option value="4">★★★★☆ — Great</option><option value="3">★★★☆☆ — Good</option><option value="2">★★☆☆☆ — Could improve</option><option value="1">★☆☆☆☆ — Disappointing</option></select></label><label>Your review<textarea value={reviewForm.comment} minLength="8" maxLength="1000" required onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })} placeholder="What should other guests know?" /></label><button className="button button-primary">Post review <ArrowRight size={14} /></button></form>}</section></div></article></div>}
    {toast && <div className="toast"><Check size={15} />{toast}</div>}
  </div>;
}

function EventToolbar({ query, setQuery, category, setCategory, sort, setSort, admin = false, status, setStatus, dateRange, setDateRange, categories: availableCategories = categories }) {
  return <div className="view-tools"><label className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events" /></label><select className="select-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{availableCategories.map((item) => <option key={item}>{item}</option>)}</select>{admin ? <select className="select-filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option>Published</option><option>Draft</option><option>Cancelled</option></select> : <select className="select-filter" value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="upcoming">Upcoming</option><option value="all">All dates</option></select>}<select className="select-filter" value={sort} onChange={(event) => setSort(event.target.value)}><option value="eventDate">Soonest</option><option value="newest">Recently added</option><option value="price">Price: low to high</option></select></div>;
}

function Pager({ page, pagination, setPage }) {
  if (pagination.pages <= 1) return null;
  return <div className="pagination"><span>Page {page} of {pagination.pages}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>Next <ArrowRight size={13} /></button></div></div>;
}

function EmptyState({ loading, clear, saved = false, tickets = false }) {
  return <div className="empty-state"><span>{loading ? <Activity size={22} /> : tickets ? <Ticket size={22} /> : saved ? <Heart size={22} /> : <Compass size={22} />}</span><h3>{loading ? 'Finding your events…' : tickets ? 'No passes just yet' : saved ? 'Your shortlist is empty' : 'No events found'}</h3><p>{loading ? 'Gatherly is refreshing the calendar.' : tickets ? 'Reserve a place and your ticket will be kept here.' : saved ? 'Tap the heart on an event to keep it for later.' : 'Try another filter or clear your search.'}</p>{clear && <button className="button button-quiet" onClick={clear}>{tickets || saved ? 'Explore events' : 'Clear filters'}</button>}</div>;
}

function EventForm({ form, setForm, busy, onCancel, categories: availableCategories = categories }) {
  const fields = [['title','Event title','text'],['location','Location','text'],['eventDate','Date','date'],['startTime','Start time','time'],['endTime','End time','time'],['capacity','Capacity','number'],['price','Ticket price (INR)','number'],['organizer','Organizer','text'],['contactEmail','Contact email','email'],['imageUrl','Cover image URL','url']];
  return <><div className="form-grid">{fields.map(([key,label,type]) => <label key={key}>{label}<input type={type} value={form[key] ?? ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={['title','location','eventDate','startTime','capacity','organizer','contactEmail'].includes(key)} /></label>)}<label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{availableCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Published</option><option>Draft</option><option>Cancelled</option></select></label><label className="full-field">Description<textarea required minLength="10" maxLength="1200" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div><div className="modal-actions"><button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save event'}<Check size={15} /></button></div></>;
}

function downloadAttendees(items) {
  const rows = [['Name', 'Email', 'Event', 'Event date', 'Registered at'], ...items.map((item) => [item.name, item.email, item.event.title, item.event.eventDate, item.registeredAt])];
  const csv = rows.map((row) => row.map((value) => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'gatherly-attendees.csv'; link.click(); URL.revokeObjectURL(link.href);
}
