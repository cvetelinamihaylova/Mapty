'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration
    }
    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription()
    }
    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace;
    }
};
class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription()
    }
    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
};


////app architecture
class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 17;
    #workouts = [];

    constructor() {
        this._getPosition();

        //get data from localStorage
        this._getLocalStorage();

        //attach event handlers
        form.addEventListener('submit', this._newWorkOut.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    };

    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert('Cannot get your coordinates!')
            });
    }
    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        //const link = `https://www.google.com/maps/@${latitude},${longitude}`;
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));
        this.#workouts.forEach(work => this._renderWorkoutMarker(work));
    }
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }
    _hideForm() {
        inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }
    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputDistance.focus();
    }
    _newWorkOut(e) {
        const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        const type = inputType.value;
        const duration = +inputDuration.value;
        const distance = +inputDistance.value;
        const { lat, lng } = this.#mapEvent.latlng;
        const coords = [lat, lng];
        let workout;

        //create new 
        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (!validInput(cadence, duration, distance) ||
                !allPositive(cadence, duration, distance)
            ) return alert('Inputs have to be positive numbers');

            workout = new Running(coords, distance, duration, cadence);
        };
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (!validInput(elevation, duration, distance) ||
                !allPositive(duration, distance)
            ) return alert('Inputs have to be positive numbers');
            workout = new Cycling(coords, distance, duration, elevation);
        };
        //add workout to the class
        this.#workouts.push(workout);

        e.preventDefault();

        // render workouts
        this._renderWorkoutMarker(workout, coords);
        this._renderWorkout(workout);

        this._hideForm();

        // set localStorage for new workouts
        this._setLocalStorage();
    }
    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }))
            .setPopupContent(`${workout.type === 'running' ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`)
            .openPopup();
    }
    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `
        if (workout.type === 'running') {
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `
        };
        if (workout.type === 'cycling') {
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `
        };

        form.insertAdjacentHTML('afterend', html);
    }
    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
        //workout.click();
    }
    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => this._renderWorkout(work));
    }
    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }
};

const app = new App();

