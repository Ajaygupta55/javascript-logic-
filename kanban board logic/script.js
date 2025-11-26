let taskData = {};

const todo = document.querySelector('#todo');
const progress = document.querySelector('#progress');
const done = document.querySelector('#done');

const columns = [todo, progress, done];
let dragElement = null;


// ---------------------- Utility Functions ----------------------

// update all column task counts
function updateCounts() {
    columns.forEach(col => {
        const count = col.querySelector('.right');
        count.innerText = col.querySelectorAll('.task').length;
    });
}

// save all tasks to localStorage
function saveToLocal() {
    columns.forEach(col => {
        const tasks = col.querySelectorAll('.task');

        taskData[col.id] = Array.from(tasks).map(task => ({
            title: task.querySelector('h2').innerText,
            description: task.querySelector('p').innerText
        }));
    });

    localStorage.setItem('taskData', JSON.stringify(taskData));
}


// create a task element
function createTask(title, description) {
    const task = document.createElement('div');
    task.classList.add('task');
    task.setAttribute('draggable', 'true');

    task.innerHTML = `
        <h2>${title}</h2>
        <p>${description}</p>
        <button>delete</button>
    `;

    // drag logic
    task.addEventListener('drag', () => {
        dragElement = task;
    });

    // DELETE BUTTON using button selector (no class needed)
    const deleteBtn = task.querySelector("button");

    deleteBtn.addEventListener("click", () => {
        task.remove();
        updateCounts();
        saveToLocal();
    });

    return task;
}


// ---------------------- Load saved tasks ----------------------

if (localStorage.getItem('taskData')) {
    taskData = JSON.parse(localStorage.getItem('taskData'));

    Object.keys(taskData).forEach(columnId => {
        const column = document.querySelector(`#${columnId}`);

        taskData[columnId].forEach(task => {
            const taskElt = createTask(task.title, task.description);
            column.appendChild(taskElt);
        });
    });

    updateCounts();
}


// ---------------------- Drag & Drop Logic ----------------------

function enableDragOnColumn(column) {

    column.addEventListener('dragenter', e => {
        e.preventDefault();
        column.classList.add('hover-over');
    });

    column.addEventListener('dragleave', e => {
        e.preventDefault();
        column.classList.remove('hover-over');
    });

    column.addEventListener('dragover', e => e.preventDefault());

    column.addEventListener('drop', e => {
        e.preventDefault();
        column.classList.remove('hover-over');

        column.appendChild(dragElement);

        updateCounts();
        saveToLocal();
    });
}

columns.forEach(col => enableDragOnColumn(col));


// ---------------------- Modal Add Task Logic ----------------------

const toggleButton = document.querySelector('#toggle-modal');
const modal = document.querySelector('.modal');
const modalBg = document.querySelector('.modal .bg');
const addTaskBtn = document.querySelector('#add-new-task');

toggleButton.addEventListener('click', () => {
    modal.classList.toggle('active');
});

modalBg.addEventListener('click', () => {
    modal.classList.remove('active');
});

addTaskBtn.addEventListener('click', () => {
    const title = document.querySelector('#task-title-input').value.trim();
    const description = document.querySelector('#task-desc-input').value.trim();

    if (!title) return;

    const newTask = createTask(title, description);
    todo.appendChild(newTask);

    updateCounts();
    saveToLocal();

    modal.classList.remove('active');
    document.querySelector('#task-title-input').value = '';
    document.querySelector('#task-desc-input').value = '';
});
