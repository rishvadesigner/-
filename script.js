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
    { name: 'backDeep', label: 'Back Deep' },
    { name: 'armHole', label: 'Arm Hole' },
    { name: 'sleeveLength', label: 'Sleeve Length' },
    { name: 'biceps', label: 'Biceps' },
    { name: 'elbow', label: 'Elbow' },
    { name: 'handMori', label: 'Hand Mori' }
];

        let orders = [];
let currentEditId = null;
async function loadOrders() {
    orders = [];
    const snapshot = await fb.getDocs(fb.collection(db, "orders"));
    snapshot.forEach(docSnap => {
        orders.push({ id: docSnap.id, ...docSnap.data() });
    });
}
        let isEditing = false;
        // Password for viewing measurements
        const ADMIN_PASSWORD = '1';

        const clothingTypeSelect = document.getElementById('clothingType');
        const otherTypeInput = document.getElementById('otherTypeInput');
        const measurementsSection = document.getElementById('measurementsSection');
        const measurementsFields = document.getElementById('measurementsFields');
        const orderForm = document.getElementById('orderForm');
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
        input.placeholder = '0.0';

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        grid.appendChild(formGroup);
    });

    measurementsFields.appendChild(grid);
}

        orderForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const notes = document.getElementById('notes').value;
    let clothingType = clothingTypeSelect.value;

// 🔥 FIXED LOGIC
if (clothingType === 'other') {
    clothingType = otherTypeInput.value.trim() || 'Other';
} else {
    clothingType = clothingTypeSelect.options[clothingTypeSelect.selectedIndex].text;
}
    const measurementData = {};
    measurements.forEach(field => {
        const input = document.getElementById(field.name);
        if (input) {
            if (input.value) {
    measurementData[field.label] = input.value + ' inch';
}
        }
    });

    const order = {
    customerName,
    customerPhone,
    clothingType,
    measurements: measurementData,
    notes: notes,
    date: new Date().toLocaleDateString()
};

if (isEditing && currentEditId) {
    await fb.deleteDoc(fb.doc(db, "orders", currentEditId));
}

    await fb.addDoc(fb.collection(db, "orders"), order);

    successMessage.style.display = 'block';
    setTimeout(() => successMessage.style.display = 'none', 3000);

    orderForm.reset();
measurementsSection.style.display = 'none';

if (isEditing) {
    isEditing = false;
    currentEditId = null;

    // Go back to measurements page
    orderFormPage.classList.add('hidden');
    measurementsPage.classList.add('active');

    displayOrders();
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

        function showMeasurementsPage() {
            orderFormPage.classList.add('hidden');
            measurementsPage.classList.add('active');
            displayOrders();
        }

        async function displayOrders() {
            await loadOrders();
    ordersList.innerHTML = '';

    const searchValue = searchInput.value.toLowerCase();

    const filteredOrders = orders.filter(order => 
        order.customerName.toLowerCase().includes(searchValue) ||
        order.customerPhone.includes(searchValue)
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
    // Works for both old and new data
    for (const key in order.measurements) {
        const value = order.measurements[key];
        measurementsHTML += `<span class="measurement-item"><strong>${key}:</strong> ${value}</span>`;
    }
}

measurementsHTML += '</div>';

        orderCard.innerHTML = `
            <h3>${order.customerName} - ${order.clothingType.toUpperCase()}</h3>
            <div class="order-details">
                <p><strong>Phone:</strong> ${order.customerPhone}</p>
                <p><strong>Date:</strong> ${order.date}</p>
                <p><strong>Measurements:</strong></p>
                ${measurementsHTML}
                ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
            </div>
            <button onclick="editOrder('${order.id}')">Edit</button>
        `;

        ordersList.appendChild(orderCard);
    });
}
searchInput.addEventListener('input', displayOrders);

window.editOrder = function(id) {
    currentEditId = id;
    const order = orders.find(o => o.id === id);
    if (!order) return;

    orderFormPage.classList.remove('hidden');
    measurementsPage.classList.remove('active');

    document.getElementById('customerName').value = order.customerName;
    document.getElementById('customerPhone').value = order.customerPhone;

    const clothingTypeSelect = document.getElementById('clothingType');
    const otherTypeInput = document.getElementById('otherTypeInput');

    if (
        ['kurti','pant','gown','lehenga','blouse','jacket','kaftan']
        .includes(order.clothingType.toLowerCase())
    ) {
        clothingTypeSelect.value = order.clothingType.toLowerCase();
        clothingTypeSelect.dispatchEvent(new Event('change'));
        otherTypeInput.style.display = 'none';
    } else {
        clothingTypeSelect.value = 'other';
        otherTypeInput.style.display = 'block';
        otherTypeInput.required = true;
        otherTypeInput.value = order.clothingType;
    }

    measurementsSection.style.display = 'block';
    generateMeasurementFields();

    setTimeout(() => {
        measurements.forEach(field => {
            const input = document.getElementById(field.name);
            if (input && order.measurements[field.label]) {
                input.value = parseFloat(order.measurements[field.label]);
            }
        });
    }, 100);

    document.getElementById('notes').value = order.notes || '';

    isEditing = true;
}
});  