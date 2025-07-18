document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const currentUserSpan = document.getElementById('current-user');
    const themeToggle = document.getElementById('theme-toggle');

    const taskInput = document.getElementById('task-input');
    const dueDateInput = document.getElementById('due-date');
    const taskCategory = document.getElementById('task-category');
    const taskTags = document.getElementById('task-tags');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const filter = document.getElementById('filter');
    const categoryFilter = document.getElementById('category-filter');
    const tagFilter = document.getElementById('tag-filter');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const clearAllBtn = document.getElementById('clear-all');
    const totalTasksSpan = document.getElementById('total-tasks');
    const completedTasksSpan = document.getElementById('completed-tasks');

    // State
    let users = JSON.parse(localStorage.getItem('taskManagerUsers')) || [];
    let currentUser = null;
    let tasks = [];
    let dragStartIndex;

    // Initialize
    checkAuthState();
    initTheme();

    // Authentication Functions
    function checkAuthState() {
        const loggedInUser = localStorage.getItem('taskManagerCurrentUser');
        if (loggedInUser) {
            currentUser = JSON.parse(loggedInUser);
            currentUserSpan.textContent = currentUser.username;
            loadTasks();
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
        } else {
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    }

    function login(username, password) {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            currentUser = user;
            localStorage.setItem('taskManagerCurrentUser', JSON.stringify(user));
            currentUserSpan.textContent = user.username;
            loadTasks();
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            return true;
        }
        return false;
    }

    function register(username, password) {
        if (users.some(u => u.username === username)) {
            alert('Username already exists');
            return false;
        }

        const newUser = {
            id: Date.now(),
            username,
            password,
            settings: { darkMode: false }
        };

        users.push(newUser);
        localStorage.setItem('taskManagerUsers', JSON.stringify(users));
        currentUser = newUser;
        localStorage.setItem('taskManagerCurrentUser', JSON.stringify(newUser));
        currentUserSpan.textContent = newUser.username;
        loadTasks();
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        return true;
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem('taskManagerCurrentUser');
        tasks = [];
        renderTasks();
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
        usernameInput.focus();
    }

    // Theme Functions
    function initTheme() {
        const savedTheme = currentUser?.settings?.darkMode ? 'dark' :
            localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        document.body.className = `${theme}-mode`;
        localStorage.setItem('theme', theme);
        if (currentUser) {
            currentUser.settings.darkMode = theme === 'dark';
            updateUser(currentUser);
        }
        themeToggle.innerHTML = theme === 'dark'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }

    function toggleTheme() {
        const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        setTheme(newTheme);
    }

    // Task Functions
    function loadTasks() {
        if (!currentUser) return;

        const allTasks = JSON.parse(localStorage.getItem('taskManagerTasks')) || [];
        tasks = allTasks.filter(task => task.userId === currentUser.id);
        renderTasks();
    }

    function saveTasks() {
        const allTasks = JSON.parse(localStorage.getItem('taskManagerTasks')) || [];
        const otherUsersTasks = allTasks.filter(task => task.userId !== currentUser.id);
        const updatedTasks = [...otherUsersTasks, ...tasks];
        localStorage.setItem('taskManagerTasks', JSON.stringify(updatedTasks));
    }

    function updateUser(user) {
        users = users.map(u => u.id === user.id ? user : u);
        localStorage.setItem('taskManagerUsers', JSON.stringify(users));
    }

    function renderTasks() {
        const filterValue = filter.value;
        const categoryFilterValue = categoryFilter.value;
        const tagFilterValue = tagFilter.value.toLowerCase();

        const filteredTasks = tasks.filter(task => {
            if (filterValue === 'completed' && !task.completed) return false;
            if (filterValue === 'pending' && task.completed) return false;
            if (categoryFilterValue !== 'all' && task.category !== categoryFilterValue) return false;
            if (tagFilterValue && (!task.tags || !task.tags.some(tag =>
                tag.toLowerCase().includes(tagFilterValue)))) return false;
            return true;
        });

        taskList.innerHTML = '';

        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<li class="no-tasks">No tasks found</li>';
            return;
        }

        filteredTasks.forEach((task) => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskItem.setAttribute('draggable', 'true');
            taskItem.setAttribute('data-id', task.id);

            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <div class="task-content">
                    <span class="task-text">${task.text}</span>
                    <div class="task-meta">
                        ${task.dueDate ? `
                            <span class="task-due ${isOverdue ? 'overdue' : ''}">
                                <i class="far fa-calendar-alt"></i>
                                ${formatDate(task.dueDate)}
                            </span>` : ''}
                        ${task.category ? `
                            <span class="task-category category-${task.category}">
                                ${task.category}
                            </span>` : ''}
                        ${task.tags && task.tags.length > 0 ? `
                            <div class="task-tags">
                                ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
                            </div>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="edit-btn" data-id="${task.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${task.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;

            taskList.appendChild(taskItem);
        });

        updateStats();
        initDragAndDrop();
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            const newTask = {
                id: Date.now(),
                userId: currentUser.id,
                text,
                dueDate: dueDateInput.value || null,
                category: taskCategory.value || null,
                tags: taskTags.value ? taskTags.value.split(',').map(tag => tag.trim()) : [],
                completed: false,
                position: tasks.length
            };

            tasks.push(newTask);
            saveTasks();
            clearInputs();
            renderTasks();
        }
    }

    function clearInputs() {
        taskInput.value = '';
        dueDateInput.value = '';
        taskCategory.value = '';
        taskTags.value = '';
    }

    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }

    function editTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        taskInput.value = task.text;
        dueDateInput.value = task.dueDate || '';
        taskCategory.value = task.category || '';
        taskTags.value = task.tags ? task.tags.join(', ') : '';

        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        taskInput.focus();
    }

    function toggleTask(id) {
        tasks = tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        );
        saveTasks();
        renderTasks();
    }

    function clearCompleted() {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }

    function clearAll() {
        if (confirm('Are you sure you want to delete all tasks?')) {
            tasks = [];
            saveTasks();
            renderTasks();
        }
    }

    function updateStats() {
        totalTasksSpan.textContent = tasks.length;
        completedTasksSpan.textContent = tasks.filter(t => t.completed).length;
    }

    // Drag and Drop
    function initDragAndDrop() {
        const listItems = document.querySelectorAll('.task-item');

        listItems.forEach(item => {
            item.addEventListener('dragstart', dragStart);
            item.addEventListener('dragover', dragOver);
            item.addEventListener('drop', drop);
            item.addEventListener('dragend', dragEnd);
        });
    }

    function dragStart(e) {
        dragStartIndex = +this.closest('li').getAttribute('data-id');
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function dragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function drop(e) {
        e.preventDefault();
        const dragEndIndex = +this.getAttribute('data-id');
        swapTasks(dragStartIndex, dragEndIndex);
    }

    function dragEnd() {
        this.classList.remove('dragging');
    }

    function swapTasks(id1, id2) {
        if (id1 === id2) return;
        const index1 = tasks.findIndex(task => task.id === id1);
        const index2 = tasks.findIndex(task => task.id === id2);
        if (index1 === -1 || index2 === -1) return;

        const tempPos = tasks[index1].position;
        tasks[index1].position = tasks[index2].position;
        tasks[index2].position = tempPos;

        tasks.sort((a, b) => a.position - b.position);
        saveTasks();
        renderTasks();
    }

    // Event Listeners
    loginBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (username && password) {
            if (login(username, password)) {
                initTheme();
            } else {
                alert('Invalid username or password');
            }
        }
    });

    registerBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (username && password) {
            register(username, password);
            initTheme();
        }
    });

    logoutBtn.addEventListener('click', logout);
    themeToggle.addEventListener('click', toggleTheme);
    addBtn.addEventListener('click', addTask);

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn') || e.target.parentElement.classList.contains('delete-btn')) {
            const id = parseInt(e.target.dataset.id || e.target.parentElement.dataset.id);
            deleteTask(id);
        } else if (e.target.classList.contains('edit-btn') || e.target.parentElement.classList.contains('edit-btn')) {
            const id = parseInt(e.target.dataset.id || e.target.parentElement.dataset.id);
            editTask(id);
        } else if (e.target.classList.contains('task-checkbox')) {
            const id = parseInt(e.target.dataset.id);
            toggleTask(id);
        }
    });

    filter.addEventListener('change', renderTasks);
    categoryFilter.addEventListener('change', renderTasks);
    tagFilter.addEventListener('input', renderTasks);
    clearCompletedBtn.addEventListener('click', clearCompleted);
    clearAllBtn.addEventListener('click', clearAll);

    // Set minimum due date to today
    dueDateInput.min = new Date().toISOString().split('T')[0];
});
