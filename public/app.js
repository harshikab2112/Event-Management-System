(function () {
  'use strict';

  angular.module('eventApp', []).controller('EventController', EventController);

  EventController.$inject = ['$http', '$timeout', '$scope'];

  function EventController($http, $timeout, $scope) {
    var vm = this;
    var searchTimer = null;

    vm.categories = ['Conference', 'Workshop', 'Meetup', 'Concert', 'Sports', 'Exhibition', 'Other'];
    vm.events = [];
    vm.filters = {
      search: '',
      category: '',
      status: '',
      from: null,
      to: null,
      sortBy: 'eventDate'
    };
    vm.form = {};
    vm.attendee = {};
    vm.selectedEvent = {};
    vm.viewMode = 'grid';
    vm.editing = false;
    vm.loading = false;
    vm.saving = false;
    vm.error = '';

    vm.loadEvents = loadEvents;
    vm.queueLoad = queueLoad;
    vm.resetFilters = resetFilters;
    vm.openCreate = openCreate;
    vm.openEdit = openEdit;
    vm.closeEventModal = closeEventModal;
    vm.saveEvent = saveEvent;
    vm.deleteEvent = deleteEvent;
    vm.openRegister = openRegister;
    vm.closeRegisterModal = closeRegisterModal;
    vm.registerAttendee = registerAttendee;
    vm.statusClass = statusClass;
    vm.capacityPercent = capacityPercent;
    vm.formatMoney = formatMoney;
    vm.dateLabel = dateLabel;
    vm.stats = stats;
    vm.exportCsv = exportCsv;
    vm.fallbackImage = fallbackImage;

    activate();

    function activate() {
      loadEvents();

      $(document).on('keyup.eventDesk', function (event) {
        if (event.key === 'Escape') {
          $scope.$apply(function () {
            closeEventModal();
            closeRegisterModal();
          });
        }
      });

      $scope.$on('$destroy', function () {
        $(document).off('keyup.eventDesk');
      });
    }

    function cleanFilters() {
      var params = {};

      Object.keys(vm.filters).forEach(function (key) {
        if (vm.filters[key]) {
          params[key] =
            vm.filters[key] instanceof Date ? toDateParam(vm.filters[key]) : vm.filters[key];
        }
      });

      return params;
    }

    function loadEvents() {
      vm.loading = true;
      vm.error = '';

      return $http
        .get('/api/events', { params: cleanFilters() })
        .then(function (response) {
          vm.events = response.data || [];
          $timeout(function () {
            $('.event-card').hide().fadeIn(140);
          });
        })
        .catch(function (error) {
          vm.error = getErrorMessage(error);
          showToast(vm.error, 'error');
        })
        .finally(function () {
          vm.loading = false;
        });
    }

    function queueLoad() {
      if (searchTimer) {
        $timeout.cancel(searchTimer);
      }

      searchTimer = $timeout(loadEvents, 250);
    }

    function resetFilters() {
      vm.filters = {
        search: '',
        category: '',
        status: '',
        from: null,
        to: null,
        sortBy: 'eventDate'
      };
      loadEvents();
    }

    function openCreate() {
      vm.editing = false;
      vm.form = {
        title: '',
        description: '',
        category: 'Conference',
        location: '',
        eventDate: new Date(),
        startTime: '10:00',
        endTime: '',
        capacity: 50,
        price: 0,
        imageUrl: '',
        organizer: '',
        contactEmail: '',
        status: 'Published'
      };
      showModal('#eventModal');
    }

    function openEdit(event) {
      vm.editing = true;
      vm.form = angular.copy(event);
      vm.form.eventDate = new Date(event.eventDate);
      showModal('#eventModal');
    }

    function closeEventModal() {
      hideModal('#eventModal');
    }

    function saveEvent() {
      vm.saving = true;
      vm.error = '';

      var payload = angular.copy(vm.form);
      var eventId = payload._id;

      delete payload._id;
      delete payload.attendees;
      delete payload.seatsBooked;
      delete payload.seatsRemaining;
      delete payload.isFull;
      delete payload.id;
      delete payload.__v;
      delete payload.createdAt;
      delete payload.updatedAt;

      var request = vm.editing
        ? $http.put('/api/events/' + eventId, payload)
        : $http.post('/api/events', payload);

      request
        .then(function () {
          showToast(vm.editing ? 'Event updated.' : 'Event created.', 'success');
          closeEventModal();
          return loadEvents();
        })
        .catch(function (error) {
          showToast(getErrorMessage(error), 'error');
        })
        .finally(function () {
          vm.saving = false;
        });
    }

    function deleteEvent(event) {
      if (!window.confirm('Delete "' + event.title + '"?')) {
        return;
      }

      $http
        .delete('/api/events/' + event._id)
        .then(function () {
          showToast('Event deleted.', 'success');
          return loadEvents();
        })
        .catch(function (error) {
          showToast(getErrorMessage(error), 'error');
        });
    }

    function openRegister(event) {
      vm.selectedEvent = angular.copy(event);
      vm.attendee = {
        name: '',
        email: '',
        phone: ''
      };
      showModal('#registerModal');
    }

    function closeRegisterModal() {
      hideModal('#registerModal');
    }

    function registerAttendee() {
      vm.saving = true;

      $http
        .post('/api/events/' + vm.selectedEvent._id + '/register', vm.attendee)
        .then(function (response) {
          vm.selectedEvent = response.data;
          showToast('Attendee registered.', 'success');
          vm.attendee = {
            name: '',
            email: '',
            phone: ''
          };
          return loadEvents();
        })
        .catch(function (error) {
          showToast(getErrorMessage(error), 'error');
        })
        .finally(function () {
          vm.saving = false;
        });
    }

    function statusClass(status) {
      return {
        Draft: 'status-draft',
        Published: 'status-published',
        Cancelled: 'status-cancelled'
      }[status];
    }

    function capacityPercent(event) {
      if (!event.capacity) {
        return 0;
      }

      return Math.min(Math.round(((event.seatsBooked || 0) / event.capacity) * 100), 100);
    }

    function formatMoney(amount) {
      var value = Number(amount || 0);

      if (value === 0) {
        return 'Free';
      }

      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value);
    }

    function dateLabel(value) {
      if (!value) {
        return '';
      }

      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(value));
    }

    function stats() {
      var today = new Date();
      today.setHours(0, 0, 0, 0);

      return vm.events.reduce(
        function (totals, event) {
          var seatsBooked = event.seatsBooked || 0;
          totals.total += 1;
          totals.booked += seatsBooked;
          totals.revenue += Number(event.price || 0) * seatsBooked;

          if (new Date(event.eventDate) >= today && event.status !== 'Cancelled') {
            totals.upcoming += 1;
          }

          return totals;
        },
        { total: 0, upcoming: 0, booked: 0, revenue: 0 }
      );
    }

    function exportCsv() {
      if (!vm.events.length) {
        showToast('No events to export.', 'error');
        return;
      }

      var headers = ['Title', 'Category', 'Date', 'Location', 'Organizer', 'Status', 'Capacity', 'Booked', 'Price'];
      var rows = vm.events.map(function (event) {
        return [
          event.title,
          event.category,
          dateLabel(event.eventDate),
          event.location,
          event.organizer,
          event.status,
          event.capacity,
          event.seatsBooked || 0,
          event.price || 0
        ];
      });

      var csv = [headers].concat(rows).map(toCsvRow).join('\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');

      link.href = url;
      link.download = 'events.csv';
      link.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported.', 'success');
    }

    function fallbackImage(category) {
      var color = {
        Conference: '0f766e',
        Workshop: 'f97316',
        Meetup: '2563eb',
        Concert: 'be123c',
        Sports: '16a34a',
        Exhibition: '7c3aed',
        Other: '52525b'
      }[category || 'Other'];

      return 'https://placehold.co/1200x700/' + color + '/ffffff?text=' + encodeURIComponent(category || 'Event');
    }

    function toDateParam(value) {
      var date = new Date(value);
      var offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return offsetDate.toISOString().slice(0, 10);
    }

    function toCsvRow(row) {
      return row
        .map(function (cell) {
          var value = String(cell == null ? '' : cell).replace(/"/g, '""');
          return '"' + value + '"';
        })
        .join(',');
    }

    function getErrorMessage(error) {
      return (
        (error && error.data && error.data.message) ||
        'Unable to complete the request. Check the server and MongoDB connection.'
      );
    }

    function showModal(selector) {
      var modal = $(selector);
      modal.css('display', 'flex').hide().fadeIn(120);
      $timeout(function () {
        modal.find('.dialog-panel').addClass('is-visible');
        modal.find('input, select, textarea').first().trigger('focus');
      });
    }

    function hideModal(selector) {
      var modal = $(selector);
      modal.find('.dialog-panel').removeClass('is-visible');
      modal.fadeOut(120);
    }

    function showToast(message, type) {
      var toast = $('#toast');
      var successClasses = 'border-teal-200 text-teal-900';
      var errorClasses = 'border-rose-200 text-rose-900';

      toast
        .removeClass(successClasses + ' ' + errorClasses)
        .addClass(type === 'success' ? successClasses : errorClasses)
        .text(message)
        .stop(true, true)
        .fadeIn(120)
        .delay(2600)
        .fadeOut(160);
    }
  }
})();
