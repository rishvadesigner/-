document.addEventListener('DOMContentLoaded', () => {
const measurements = [
    { name: 'shoulder', label: 'Shoulder' },
    { name: 'upperBust', label: 'Upper Bust' },
    { name: 'bust', label: 'Bust' },
    { name: 'underBust', label: 'Under Bust' },
    { name: 'waist', label: 'Waist' },
    { name: 'hips', label: 'Hips' },
    { name: 'length', label: 'Length' },
    { name: 'neckDeep', label: 'Neck Deep' },
    { name: 'neckRound', label: 'Neck Round' },
    { name: 'backDeep', label: 'Back Deep' },
    { name: 'armHole', label: 'Arm Hole' },
    { name: 'sleeveLength', label: 'Sleeve Length' },
    { name: 'biceps', label: 'Biceps' },
    { name: 'elbow', label: 'Elbow' },
    { name: 'handMori', label: 'Hand Mori' },
    { name: 'dartPoint', label: 'Dart Point' },
    { name: 'gotch', label: 'Gotch' },
    { name: 'thighRound', label: 'Thigh Round' },
    { name: 'kneeRound', label: 'Knee Round' },
    { name: 'calfRound', label: 'Calf Round' },
    { name: 'ankleRound', label: 'Ankle Round' }
];

// Recognized clothing type values (kept in sync with the <select> options)
const KNOWN_CLOTHING_VALUES = ['kurti', 'pant', 'gown', 'lehenga', 'blouse', 'jacket', 'kaftan'];

let orders = [];
let currentEditId = null;
let isEditing = false;

// Password for viewing measurements
// NOTE: this only hides a UI button. It is NOT real security — anyone with
// the Firebase config can read/write Firestore directly unless Firestore
// Security Rules are configured on the backend. See note at bottom of file.
const ADMIN_PASSWORD = 'rs';

const clothingTypeSelect = document.getElementById('clothingType');
const otherTypeInput = document.getElementById('otherTypeInput');
const measurementsSection = document.getElementById('measurementsSection');
const measurementsFields = document.getElementById('measurementsFields');
const orderForm = document.getElementById('orderForm');
const submitBtn = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const ordersList = document.getElementById('ordersList');
const searchInput = document.getElementById('searchInput');
const viewMeasurementsBtn = document.getElementById('viewMeasurementsBtn');
const passwordModal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('passwordInput');
const submitPasswordBtn = document.getElementById('submitPasswordBtn');
const cancelBtn = document.getElementById('cancelBtn');
const errorMessage = document.getElementById('errorMessage');
const backBtn = document.getElementById('backBtn');

const orderFormPage = document.getElementById('orderFormPage');
const measurementsPage = document.getElementById('measurementsPage');

async function loadOrders() {
    orders = [];
    try {
        const snapshot = await fb.getDocs(fb.collection(db, "orders"));
        snapshot.forEach(docSnap => {
            orders.push({ id: docSnap.id, ...docSnap.data() });
        });
    } catch (err) {
        console.error('Failed to load orders:', err);
        ordersList.innerHTML = '<div class="no-orders">Could not load orders. Check your connection and try again.</div>';
        throw err;
    }
}

clothingTypeSelect.addEventListener('change', function() {
    const selectedType = this.value;

    if (selectedType === 'other') {
        otherTypeInput.style.display = 'block';
        otherTypeInput.required = true;
        measurementsSection.style.display = 'block';
        generateMeasurementFields();
        return;
    } else {
        otherTypeInput.style.display = 'none';
        otherTypeInput.required = false;
        otherTypeInput.value = '';
    }

    if (selectedType) {
        measurementsSection.style.display = 'block';
        generateMeasurementFields();
    } else {
        measurementsSection.style.display = 'none';
    }
});

function generateMeasurementFields() {
    measurementsFields.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'measurements-grid';

    measurements.forEach(field => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = field.label;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = field.name;
        input.name = field.name;
        input.step = '0.5';
        input.min = '0';
        input.placeholder = '0.0';

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        grid.appendChild(formGroup);
    });

    measurementsFields.appendChild(grid);
    const customContainer = document.createElement('div');
customContainer.id = 'customMeasurementsContainer';

customContainer.innerHTML = `
    <h3 style="margin-top:20px;">Custom Measurements</h3>
    <button type="button" id="addCustomMeasurementBtn">
        + Add Custom Measurement
    </button>
    <div id="customMeasurementsList"></div>
`;

measurementsFields.appendChild(customContainer);

document.getElementById('addCustomMeasurementBtn').onclick = () => addCustomMeasurement();
    return Promise.resolve();
}
function addCustomMeasurement(name = '', value = '') {

    const row = document.createElement('div');
    row.className = 'custom-measurement-row';

    row.innerHTML = `
        <input type="text"
               class="custom-name"
               placeholder="Name"
               value="${name}">

        <input type="number"
               step="0.5"
               class="custom-value"
               placeholder="Value"
               value="${value}">

        <button type="button" class="remove-custom-btn">
            ❌
        </button>
    `;

    row.querySelector('.remove-custom-btn').onclick = () => row.remove();

    document.getElementById('customMeasurementsList').appendChild(row);
}
// Populates measurement inputs from saved data. Returns once fields exist,
// no setTimeout guessing involved — generateMeasurementFields() builds the
// DOM synchronously, so this can run immediately after it.
function populateMeasurementFields(savedMeasurements) {
    if (!savedMeasurements) return;
    measurements.forEach(field => {
        const input = document.getElementById(field.name);
        const savedValue = savedMeasurements[field.label];
        if (input && savedValue !== undefined) {
            const numeric = parseFloat(savedValue);
            if (!Number.isNaN(numeric)) {
                input.value = numeric;
            }
        }
    });
}

orderForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const notes = document.getElementById('notes').value.trim();
    let clothingTypeValue = clothingTypeSelect.value;
    let clothingType;

    if (clothingTypeValue === 'other') {
        clothingType = otherTypeInput.value.trim() || 'Other';
    } else {
        clothingType = clothingTypeSelect.options[clothingTypeSelect.selectedIndex].text;
    }

    // Start with existing measurements when editing
const measurementData = isEditing && currentEditId
    ? { ...orders.find(o => o.id === currentEditId).measurements }
    : {};

// Update measurements from current form
measurements.forEach(field => {
    const input = document.getElementById(field.name);

    if (input && input.value) {
        measurementData[field.label] = input.value + ' inch';
    }
});
    document.querySelectorAll('.custom-measurement-row').forEach(row => {

    const name = row.querySelector('.custom-name').value.trim();
    const value = row.querySelector('.custom-value').value;

    if (name && value) {
        measurementData[name] = value + ' inch';
    }

});

    const order = {
        customerName,
        customerPhone,
        clothingType,
        clothingTypeValue: clothingTypeValue === 'other' ? 'other' : clothingTypeValue, // preserve original select value for reliable future edits
        measurements: measurementData,
        notes,
        date: new Date().toLocaleDateString()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        if (isEditing && currentEditId) {
            // Save-then-delete (not delete-then-save): if this write fails,
            // the original document is untouched and no data is lost.
            await fb.setDoc(fb.doc(db, "orders", currentEditId), order);
        } else {
            await fb.addDoc(fb.collection(db, "orders"), order);
        }

        successMessage.style.display = 'block';
        setTimeout(() => successMessage.style.display = 'none', 3000);

        orderForm.reset();
        measurementsSection.style.display = 'none';
        otherTypeInput.style.display = 'none';

        if (isEditing) {
            isEditing = false;
            currentEditId = null;
            orderFormPage.classList.add('hidden');
            measurementsPage.classList.add('active');
            await displayOrders();
        }
    } catch (err) {
        console.error('Failed to save order:', err);
        alert('Could not save the order. Please check your connection and try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Order';
    }
});

viewMeasurementsBtn.addEventListener('click', function() {
    passwordModal.classList.add('active');
    passwordInput.value = '';
    errorMessage.textContent = '';
    passwordInput.focus();
});

cancelBtn.addEventListener('click', function() {
    passwordModal.classList.remove('active');
});

submitPasswordBtn.addEventListener('click', function() {
    checkPassword();
});

passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkPassword();
    }
});

backBtn.addEventListener('click', function() {
    orderFormPage.classList.remove('hidden');
    measurementsPage.classList.remove('active');
    // Clear any in-progress edit state when navigating away without saving
    isEditing = false;
    currentEditId = null;
});

function checkPassword() {
    const enteredPassword = passwordInput.value;

    if (enteredPassword === ADMIN_PASSWORD) {
        passwordModal.classList.remove('active');
        showMeasurementsPage();
    } else {
        errorMessage.textContent = 'Incorrect password. Please try again.';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

async function showMeasurementsPage() {
    orderFormPage.classList.add('hidden');
    measurementsPage.classList.add('active');
    await displayOrders();
}

async function displayOrders() {
    ordersList.innerHTML = '<div class="no-orders">Loading...</div>';
    try {
        await loadOrders();
    } catch {
        return; // loadOrders() already rendered an error message
    }

    ordersList.innerHTML = '';

    const searchValue = searchInput.value.toLowerCase();

    const filteredOrders = orders.filter(order =>
        (order.customerName || '').toLowerCase().includes(searchValue) ||
        (order.customerPhone || '').includes(searchValue)
    );

    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<div class="no-orders">No matching orders found.</div>';
        return;
    }

    filteredOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';

        let measurementsHTML = '<div style="margin-top: 10px;">';
        if (order.measurements) {
            for (const key in order.measurements) {
                const value = order.measurements[key];
                measurementsHTML += `<span class="measurement-item"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value))}</span>`;
            }
        }
        measurementsHTML += '</div>';

        orderCard.innerHTML = `
            <h3>${escapeHtml(order.customerName)} - ${escapeHtml((order.clothingType || '').toUpperCase())}</h3>
            <div class="order-details">
                <p><strong>Phone:</strong> ${escapeHtml(order.customerPhone)}</p>
                <p><strong>Date:</strong> ${escapeHtml(order.date)}</p>
                <p><strong>Measurements:</strong></p>
                ${measurementsHTML}
                ${order.notes ? `<p><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ''}
            </div>
            <div class="card-buttons">
                <button type="button" class="edit-btn">Edit</button>
                <button type="button" class="delete-btn">Delete</button>
            </div>
        `;

        orderCard.querySelector('.edit-btn').addEventListener('click', () => editOrder(order.id));
        orderCard.querySelector('.delete-btn').addEventListener('click', () => deleteOrder(order.id));

        ordersList.appendChild(orderCard);
    });
}

// Basic HTML escaping so customer-entered text (name, notes, etc.) can never
// break the page or inject markup when rendered back into the DOM.
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

searchInput.addEventListener('input', displayOrders);

async function deleteOrder(id) {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    try {
        await fb.deleteDoc(fb.doc(db, "orders", id));
        await displayOrders();
    } catch (err) {
        console.error('Failed to delete order:', err);
        alert('Could not delete the order. Please try again.');
    }
}

function editOrder(id) {
    currentEditId = id;
    const order = orders.find(o => o.id === id);
    if (!order) return;

    orderFormPage.classList.remove('hidden');
    measurementsPage.classList.remove('active');

    document.getElementById('customerName').value = order.customerName || '';
    document.getElementById('customerPhone').value = order.customerPhone || '';

    // Prefer the stored select-value (clothingTypeValue) when available —
    // this is reliable even if display text changes later. Fall back to
    // matching against the known option values for older records that
    // don't have clothingTypeValue saved yet.
    const storedValue = order.clothingTypeValue ||
        (KNOWN_CLOTHING_VALUES.includes((order.clothingType || '').toLowerCase())
            ? order.clothingType.toLowerCase()
            : 'other');

    if (storedValue !== 'other' && KNOWN_CLOTHING_VALUES.includes(storedValue)) {
        clothingTypeSelect.value = storedValue;
        otherTypeInput.style.display = 'none';
        otherTypeInput.required = false;
    } else {
        clothingTypeSelect.value = 'other';
        otherTypeInput.style.display = 'block';
        otherTypeInput.required = true;
        otherTypeInput.value = order.clothingType || '';
    }

    measurementsSection.style.display = 'block';
generateMeasurementFields();
populateMeasurementFields(order.measurements);

// Restore custom measurements
for (const key in order.measurements) {

    const predefined = measurements.some(field => field.label === key);

    if (!predefined) {
        addCustomMeasurement(
            key,
            parseFloat(order.measurements[key])
        );
    }

}

document.getElementById('notes').value = order.notes || '';

isEditing = true;
    orderFormPage.scrollIntoView({ behavior: 'smooth' });
}

});
