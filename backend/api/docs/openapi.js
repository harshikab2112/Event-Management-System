const auth = { security: [{ bearerAuth: [] }] };
const response = (description) => ({ description });
const pathId = [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }];
const eventSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 3, maxLength: 120 },
    description: { type: 'string', minLength: 10, maxLength: 1200 },
    category: { type: 'string', minLength: 2, maxLength: 40, description: 'Name of an active database-managed category.' },
    location: { type: 'string' }, eventDate: { type: 'string', format: 'date-time' },
    startTime: { type: 'string', example: '10:00' }, endTime: { type: 'string' },
    capacity: { type: 'integer', minimum: 1 }, price: { type: 'number', minimum: 0 },
    imageUrl: { type: 'string', format: 'uri' }, organizer: { type: 'string' },
    contactEmail: { type: 'string', format: 'email' },
    status: { type: 'string', enum: ['Draft', 'Published', 'Cancelled'] }
  }
};
const credentials = {
  type: 'object', required: ['email', 'password'],
  properties: { name: { type: 'string', minLength: 2 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 10 } }
};

module.exports = {
  openapi: '3.0.3',
  info: { title: 'Gatherly Event Platform API', version: '1.0.0', description: 'JWT-authenticated event discovery, management, and registration API.' },
  servers: [{ url: '/api', description: 'Current API base path' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { message: { type: 'string' } } },
      Event: { ...eventSchema, required: ['title', 'description', 'category', 'location', 'eventDate', 'startTime', 'capacity', 'organizer', 'contactEmail'] },
      EventUpdate: eventSchema, Credentials: credentials,
      Review: { type: 'object', required: ['rating', 'comment'], properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string', minLength: 8, maxLength: 1000 } } }
    }
  },
  paths: {
    '/health': { get: { summary: 'Check API and database health', responses: { 200: response('API and database are healthy'), 503: response('Database is unavailable') } } },
    '/openapi.json': { get: { summary: 'Get this OpenAPI specification', responses: { 200: response('OpenAPI document') } } },
    '/categories': {
      get: { summary: 'List active categories (admins receive archived categories too)', responses: { 200: response('Category catalog') } },
      post: { ...auth, summary: 'Create an event category (admin)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 2, maxLength: 40 }, description: { type: 'string', maxLength: 240 }, sortOrder: { type: 'integer', minimum: 0 } } } } } }, responses: { 201: response('Category created'), 409: response('Category name already exists') } }
    },
    '/categories/{id}': {
      parameters: pathId,
      patch: { ...auth, summary: 'Rename, describe, reorder, archive, or publish a category (admin)', responses: { 200: response('Category updated'), 404: response('Category not found') } },
      delete: { ...auth, summary: 'Delete an unused category (admin)', responses: { 200: response('Category deleted'), 409: response('Category is in use by events') } }
    },
    '/inquiries': {
      post: { summary: 'Submit a private event inquiry', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'message'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, eventId: { type: 'string' }, guests: { type: 'integer', minimum: 1 }, budget: { type: 'string' }, message: { type: 'string', minLength: 10, maxLength: 1500 } } } } } }, responses: { 201: response('Inquiry received'), 429: response('Inquiry rate limit reached') } },
      get: { ...auth, summary: 'List customer inquiries (admin)', responses: { 200: response('Inquiry inbox'), 403: response('Admin role required') } }
    },
    '/inquiries/{id}': { parameters: pathId, patch: { ...auth, summary: 'Update inquiry status (admin)', responses: { 200: response('Inquiry updated') } } },
    '/reviews/featured': { get: { summary: 'List recent high-rated public event reviews', responses: { 200: response('Featured testimonials') } } },
    '/auth/register': {
      post: {
        summary: 'Legacy registration endpoint; disabled outside test runs. Use OTP signup in production.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } } },
        responses: { 201: response('Account created'), 400: response('Invalid request'), 409: response('Email already exists') }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Sign in and receive a JWT',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } } },
        responses: { 200: response('JWT and profile'), 401: response('Invalid credentials') }
      }
    },
    '/auth/otp/signup/request': { post: { summary: 'Send a one-time code to verify a new account email', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string', minLength: 2, maxLength: 80 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 10, maxLength: 128 } } } } } }, responses: { 202: response('Code sent if SMTP is configured'), 429: response('Rate limit or resend cooldown') } } },
    '/auth/otp/signup/verify': { post: { summary: 'Verify email code and create account', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'code'], properties: { email: { type: 'string', format: 'email' }, code: { type: 'string', pattern: '^\\d{6}$' } } } } } }, responses: { 201: response('Account created and JWT issued'), 400: response('Code expired or incorrect') } } },
    '/auth/otp/login/request': { post: { summary: 'Request passwordless sign-in code', responses: { 202: response('Generic response to protect account privacy'), 429: response('Rate limit or resend cooldown') } } },
    '/auth/otp/login/verify': { post: { summary: 'Verify sign-in code and issue JWT', responses: { 200: response('JWT and profile'), 400: response('Code expired or incorrect') } } },
    '/auth/otp/password-reset/request': { post: { summary: 'Request a password reset code', responses: { 202: response('Generic response to protect account privacy') } } },
    '/auth/otp/password-reset/verify': { post: { summary: 'Verify reset code and set a new password', responses: { 200: response('Password updated'), 400: response('Code expired or incorrect') } } },
    '/auth/google': { post: { summary: 'Verify Google ID credential and issue JWT', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['credential'], properties: { credential: { type: 'string' } } } } } }, responses: { 200: response('JWT and profile'), 401: response('Google credential invalid') } } },
    '/auth/me': {
      get: { ...auth, summary: 'Get the current profile', responses: { 200: response('Current user'), 401: response('Authentication required') } },
      patch: { ...auth, summary: 'Update display name', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 2, maxLength: 80 } } } } } }, responses: { 200: response('Updated profile') } }
    },
    '/me/favorites': { get: { ...auth, summary: 'List saved events', responses: { 200: response('Customer saved events') } } },
    '/me/favorites/{eventId}': {
      parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
      put: { ...auth, summary: 'Save an event', responses: { 201: response('Event saved') } },
      delete: { ...auth, summary: 'Remove a saved event', responses: { 200: response('Event unsaved') } }
    },
    '/me/notifications': { get: { ...auth, summary: 'Get notification inbox and unread count', responses: { 200: response('Notification inbox') } } },
    '/me/notifications/read-all': { patch: { ...auth, summary: 'Mark all notifications as read', responses: { 200: response('Inbox updated') } } },
    '/me/notifications/{id}/read': { parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], patch: { ...auth, summary: 'Mark a notification as read', responses: { 200: response('Notification updated') } } },
    '/events': {
      get: {
        summary: 'Search, filter, sort, and paginate published events',
        parameters: ['search', 'category', 'from', 'to', 'sortBy', 'order', 'page', 'limit'].map((name) => ({ in: 'query', name, schema: { type: 'string' } })),
        responses: { 200: response('Event list and pagination') }
      },
      post: {
        ...auth, summary: 'Create an event (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } },
        responses: { 201: response('Event created'), 401: response('Authentication required'), 403: response('Admin role required') }
      }
    },
    '/events/stats': { get: { ...auth, summary: 'Get dashboard metrics (admin)', responses: { 200: response('Event, booking, and revenue metrics'), 403: response('Admin role required') } } },
    '/events/my-registrations': { get: { ...auth, summary: 'List my registrations', responses: { 200: response('Current user registrations') } } },
    '/events/attendees': { get: { ...auth, summary: 'Search registered guests (admin)', parameters: [{ in: 'query', name: 'search', schema: { type: 'string' } }], responses: { 200: response('Guest list with event details'), 403: response('Admin role required') } } },
    '/events/{id}/reviews': {
      parameters: pathId,
      get: { summary: 'Read event reviews and rating summary', responses: { 200: response('Reviews and average rating') } },
      post: { ...auth, summary: 'Leave a review after attending an event', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } } }, responses: { 201: response('Review created'), 403: response('Only attendees may review') } }
    },
    '/events/{id}': {
      parameters: pathId,
      get: { summary: 'Get a published event without attendee PII', responses: { 200: response('Event details'), 404: response('Event not found') } },
      put: {
        ...auth, summary: 'Update an event (admin)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EventUpdate' } } } },
        responses: { 200: response('Updated event'), 400: response('Invalid update') }
      },
      delete: { ...auth, summary: 'Delete an event (admin)', responses: { 200: response('Event deleted'), 403: response('Admin role required') } }
    },
    '/events/{id}/registrations': {
      parameters: pathId,
      post: { ...auth, summary: 'Reserve one seat for the current user', responses: { 201: response('Reservation created'), 409: response('Full event or duplicate reservation') } }
    },
    '/events/{id}/registrations/me': {
      parameters: pathId,
      delete: { ...auth, summary: 'Cancel my reservation', responses: { 200: response('Reservation cancelled'), 404: response('Registration not found') } }
    },
    '/events/{id}/check-in': { parameters: pathId, post: { ...auth, summary: 'Validate and check in a QR ticket (admin)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['ticketCode'], properties: { ticketCode: { type: 'string', minLength: 20, maxLength: 64 } } } } } }, responses: { 200: response('Ticket checked in'), 404: response('Ticket is invalid or already used') } } }
  }
};
