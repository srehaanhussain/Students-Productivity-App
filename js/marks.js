// Marks Tracker Module functionality for Student Productivity App

// Firebase references
const marksRef = rtdb.ref('marks');
const subjectsRef = rtdb.ref('subjects');

// DOM Elements - will be initialized after DOM content is loaded
let subjectForm;
let markEntryForm;
let subjectsList;
let performanceDashboard;
let statisticsContainer;
let analyzeButton;

// Initialize Marks Tracker module
function initMarksModule() {
    console.log('Initializing Marks Tracker Module');
    
    // Get DOM elements
    subjectForm = document.getElementById('subject-form');
    markEntryForm = document.getElementById('mark-entry-form');
    subjectsList = document.getElementById('subjects-list');
    performanceDashboard = document.getElementById('performance-dashboard');
    statisticsContainer = document.getElementById('statistics-container');
    analyzeButton = document.getElementById('analyze-performance-btn');
    
    // Set up event listeners
    setupEventListeners();
    
    // Load user's subjects
    loadSubjects();
    
    // Load performance data
    loadPerformanceData();
}

// Initialize the Marks module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    auth.onAuthStateChanged(user => {
        if (user) {
            initMarksModule();
        }
    });
});

// Set up event listeners for the Marks module
function setupEventListeners() {
    // Subject form submission
    subjectForm.addEventListener('submit', handleSubjectFormSubmit);
    
    // Mark entry form submission
    markEntryForm.addEventListener('submit', handleMarkEntryFormSubmit);
    
    // Analyze performance button
    analyzeButton.addEventListener('click', analyzePerformance);
    
    // Exam type change event
    document.getElementById('exam-type').addEventListener('change', handleExamTypeChange);
    
    // Subject change event to update exam types
    document.getElementById('mark-subject').addEventListener('change', handleSubjectChange);
    
    // Reset buttons
    document.getElementById('reset-subject-form-btn').addEventListener('click', resetSubjectForm);
    document.getElementById('reset-mark-form-btn').addEventListener('click', resetMarkForm);
    
    // Performance tabs
    const tabLinks = document.querySelectorAll('.performance-tab');
    tabLinks.forEach(tabLink => {
        tabLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchPerformanceTab(tabLink.dataset.tab);
        });
    });

    // Add event listener for the download all marks button
    document.getElementById('download-all-marks-btn').addEventListener('click', () => downloadMarksData());
}

// Reset subject form
function resetSubjectForm() {
    subjectForm.reset();
    showInfoNotification('Subject form has been reset');
}

// Reset mark entry form
function resetMarkForm() {
    markEntryForm.reset();
    
    // Hide the exam number container
    const examNumberContainer = document.getElementById('exam-number-container');
    examNumberContainer.classList.add('hidden');
    document.getElementById('exam-number').required = false;
    
    showInfoNotification('Mark entry form has been reset');
}

// Handle subject form submission
async function handleSubjectFormSubmit(e) {
    e.preventDefault();
    
    // Get current user
    const user = auth.currentUser;
    if (!user) {
        showErrorNotification('You must be logged in to add subjects');
        return;
    }
    
    // Get form values
    const subjectNameInput = document.getElementById('subject-name');
    const subjectCodeInput = document.getElementById('subject-code');
    const maxMarksInput = document.getElementById('subject-max-marks');
    
    const subjectName = subjectNameInput.value.trim();
    const subjectCode = subjectCodeInput.value.trim();
    const maxMarks = parseInt(maxMarksInput.value);
    
    // Validate inputs
    if (!subjectName || !subjectCode || isNaN(maxMarks)) {
        showErrorNotification('Please fill all fields correctly');
        return;
    }
    
    if (maxMarks <= 0) {
        showErrorNotification('Maximum marks must be greater than zero');
        maxMarksInput.focus();
        return;
    }
    
    try {
        // Check if subject name or code already exists
        const subjectsSnapshot = await subjectsRef.child(user.uid).once('value');
        const subjects = subjectsSnapshot.val() || {};
        
        // Check for duplicate subject name
        const duplicateNameSubject = Object.values(subjects).find(
            subject => subject.name.toLowerCase() === subjectName.toLowerCase()
        );
        
        if (duplicateNameSubject) {
            showErrorNotification(`Subject with name "${subjectName}" already exists`);
            subjectNameInput.value = ''; // Reset only the name field
            subjectNameInput.focus();
            return;
        }
        
        // Check for duplicate subject code
        const duplicateCodeSubject = Object.values(subjects).find(
            subject => subject.code.toLowerCase() === subjectCode.toLowerCase()
        );
        
        if (duplicateCodeSubject) {
            showErrorNotification(`Subject with code "${subjectCode}" already exists`);
            subjectCodeInput.value = ''; // Reset only the code field
            subjectCodeInput.focus();
            return;
        }
        
        // Create subject object
        const subjectId = generateId();
        const subject = {
            id: subjectId,
            name: subjectName,
            code: subjectCode,
            maxMarks: maxMarks,
            userId: user.uid,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Save to Firebase
        await subjectsRef.child(user.uid).child(subjectId).set(subject);
        
        // Clear form
        subjectForm.reset();
        
        // Show success message
        showSuccessNotification(`Subject "${subjectName}" (Code: ${subjectCode}, Max Marks: ${maxMarks}) added successfully`);
        
        // Refresh subjects list
        loadSubjects();
        
        // Update subject dropdown in mark entry form
        updateSubjectDropdown();
    } catch (error) {
        console.error('Error adding subject:', error);
        showErrorNotification('Failed to add subject. Please try again.');
    }
}

// Handle mark entry form submission
async function handleMarkEntryFormSubmit(e) {
    e.preventDefault();
    
    // Get current user
    const user = auth.currentUser;
    if (!user) {
        showErrorNotification('You must be logged in to add marks');
        return;
    }
    
    // Get form values
    const subjectSelect = document.getElementById('mark-subject');
    const markValueInput = document.getElementById('mark-value');
    const examTypeInput = document.getElementById('exam-type');
    const examDateInput = document.getElementById('exam-date');
    
    const subjectId = subjectSelect.value;
    const markValue = parseFloat(markValueInput.value);
    const examType = examTypeInput.value;
    const examDate = examDateInput.value;
    
    // Get subject name
    const subjectName = subjectSelect.options[subjectSelect.selectedIndex]?.text || 'Unknown';
    
    // Get exam number if applicable
    let examNumber = null;
    if (examType === 'Mid-Term' || examType === 'Unit Test' || examType === 'Revision Test') {
        examNumber = document.getElementById('exam-number').value;
        if (!examNumber) {
            showErrorNotification('Please enter the test number');
            document.getElementById('exam-number').focus();
            return;
        }
    }
    
    // Validate inputs
    if (!subjectId || isNaN(markValue) || !examType || !examDate) {
        showErrorNotification('Please fill all fields correctly');
        return;
    }
    
    try {
        // Check for duplicate exam types and test numbers
        const marksSnapshot = await marksRef.child(user.uid).once('value');
        const marks = marksSnapshot.val() || {};
        
        // Filter marks to only include the current subject
        const subjectMarks = Object.values(marks).filter(mark => mark.subjectId === subjectId);
        
        // For exam types that don't have multiple instances (Quarterly, Half Yearly, Annually)
        if (['Quarterly', 'Half Yearly', 'Annually'].includes(examType)) {
            // Check if this exam type already exists for this subject
            const duplicateExamType = subjectMarks.find(mark => mark.examType === examType);
            
            if (duplicateExamType) {
                showErrorNotification(`This subject already has a ${examType} exam recorded`);
                // Reset exam type field
                examTypeInput.value = '';
                examTypeInput.focus();
                return;
            }
        } 
        // For exam types that can have multiple instances but need unique test numbers
        else if (['Mid-Term', 'Unit Test', 'Revision Test'].includes(examType) && examNumber) {
            // Check if this exam type with this test number already exists for this subject
            const duplicateTestNumber = subjectMarks.find(
                mark => mark.examType === examType && mark.examNumber === examNumber
            );
            
            if (duplicateTestNumber) {
                showErrorNotification(`${examType} #${examNumber} already exists for this subject`);
                // Reset only the test number field
                document.getElementById('exam-number').value = '';
                document.getElementById('exam-number').focus();
                return;
            }
        }
        
        // Get subject details to validate mark value
        const subjectSnapshot = await subjectsRef.child(user.uid).child(subjectId).once('value');
        const subject = subjectSnapshot.val();
        
        if (!subject) {
            showErrorNotification('Subject not found');
            return;
        }
        
        // Validate mark value against max marks
        if (markValue < 0 || markValue > subject.maxMarks) {
            showErrorNotification(`Mark must be between 0 and ${subject.maxMarks}`);
            markValueInput.value = '';
            markValueInput.focus();
            return;
        }
        
        // Calculate percentage
        const percentage = (markValue / subject.maxMarks) * 100;
        const formattedPercentage = percentage.toFixed(1);
        
        // Create mark entry object
        const markId = generateId();
        const markEntry = {
            id: markId,
            subjectId: subjectId,
            subjectName: subject.name,
            value: markValue,
            maxMarks: subject.maxMarks,
            percentage: percentage,
            examType: examType,
            examDate: examDate,
            examNumber: examNumber,
            userId: user.uid,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Save to Firebase
        await marksRef.child(user.uid).child(markId).set(markEntry);
        
        // Clear form
        markEntryForm.reset();
        
        // Reset exam number field
        const examNumberContainer = document.getElementById('exam-number-container');
        examNumberContainer.classList.add('hidden');
        document.getElementById('exam-number').required = false;
        
        // Format exam type display for notification
        let examTypeDisplay = examType;
        if (examNumber) {
            examTypeDisplay = `${examType} #${examNumber}`;
        }
        
        // Show success message with details
        showSuccessNotification(`${subjectName}: ${examTypeDisplay} mark (${markValue}/${subject.maxMarks} - ${formattedPercentage}%) added successfully`);
        
        // Refresh performance data
        loadPerformanceData();
    } catch (error) {
        console.error('Error adding mark:', error);
        showErrorNotification('Failed to add mark. Please try again.');
    }
}

// Load user's subjects
async function loadSubjects() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        // Get subjects from Firebase
        const snapshot = await subjectsRef.child(user.uid).orderByChild('createdAt').once('value');
        const subjects = snapshot.val() || {};
        
        // Clear subjects list
        subjectsList.innerHTML = '';
        
        // Check if there are any subjects
        if (Object.keys(subjects).length === 0) {
            subjectsList.innerHTML = '<p class="text-gray-500 text-center py-4">No subjects added yet</p>';
            return;
        }
        
        // Render subjects
        Object.values(subjects).reverse().forEach(subject => {
            renderSubject(subject);
        });
        
        // Update subject dropdown in mark entry form
        updateSubjectDropdown();
    } catch (error) {
        console.error('Error loading subjects:', error);
        showErrorNotification('Failed to load subjects');
    }
}

// Render a subject in the subjects list
function renderSubject(subject) {
    const subjectElement = document.createElement('div');
    subjectElement.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3';
    subjectElement.innerHTML = `
        <div class="flex justify-between items-center">
            <div>
                <h4 class="font-semibold text-gray-800">${subject.name}</h4>
                <p class="text-sm text-gray-600">Code: ${subject.code}</p>
            </div>
            <div class="text-right">
                <p class="text-sm text-gray-600">Max Marks: ${subject.maxMarks}</p>
                <button class="delete-subject-btn text-red-500 text-sm hover:text-red-700" data-id="${subject.id}">
                    Delete
                </button>
            </div>
        </div>
    `;
    
    // Add event listener to delete button
    const deleteButton = subjectElement.querySelector('.delete-subject-btn');
    deleteButton.addEventListener('click', () => deleteSubject(subject.id));
    
    // Add to subjects list
    subjectsList.appendChild(subjectElement);
}

// Update subject dropdown in mark entry form
async function updateSubjectDropdown() {
    const user = auth.currentUser;
    if (!user) return;
    
    const subjectSelect = document.getElementById('mark-subject');
    
    try {
        // Get subjects from Firebase
        const snapshot = await subjectsRef.child(user.uid).orderByChild('name').once('value');
        const subjects = snapshot.val() || {};
        
        // Clear dropdown
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        
        // Add subjects to dropdown
        Object.values(subjects).forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.id;
            option.textContent = subject.name;
            subjectSelect.appendChild(option);
        });
        
        // Show notification if no subjects exist
        if (Object.keys(subjects).length === 0) {
            showInfoNotification('No subjects found. Please add a subject first.');
        } else {
            // Trigger subject change to update exam types
            handleSubjectChange();
        }
        
    } catch (error) {
        console.error('Error updating subject dropdown:', error);
        showErrorNotification('Failed to load subjects. Please refresh the page.');
    }
}

// Delete a subject
async function deleteSubject(subjectId) {
    if (!confirm('Are you sure you want to delete this subject? All associated marks will also be deleted.')) {
        return;
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        // Delete subject from Firebase
        await subjectsRef.child(user.uid).child(subjectId).remove();
        
        // Delete associated marks
        const marksSnapshot = await marksRef.child(user.uid).orderByChild('subjectId').equalTo(subjectId).once('value');
        const marks = marksSnapshot.val() || {};
        
        // Delete each mark
        const deletePromises = Object.keys(marks).map(markId => {
            return marksRef.child(user.uid).child(markId).remove();
        });
        
        await Promise.all(deletePromises);
        
        // Show success message
        showSuccessNotification('Subject deleted successfully');
        
        // Refresh subjects list
        loadSubjects();
        
        // Refresh performance data
        loadPerformanceData();
    } catch (error) {
        console.error('Error deleting subject:', error);
        showErrorNotification('Failed to delete subject');
    }
}

// Load performance data
async function loadPerformanceData() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        // Clear performance dashboard
        performanceDashboard.innerHTML = '';
        
        // Clear category-specific content areas
        document.getElementById('unit-tests-content').innerHTML = '';
        document.getElementById('quarterly-content').innerHTML = '';
        document.getElementById('half-yearly-content').innerHTML = '';
        document.getElementById('annually-content').innerHTML = '';
        document.getElementById('revision-tests-content').innerHTML = '';
        
        // Get marks from Firebase
        const marksSnapshot = await marksRef.child(user.uid).orderByChild('createdAt').once('value');
        const marks = marksSnapshot.val() || {};
        
        // Check if there are any marks
        if (Object.keys(marks).length === 0) {
            performanceDashboard.innerHTML = '<p class="text-gray-500 text-center py-4">No marks added yet</p>';
            
            // Also update the category-specific content areas
            document.getElementById('unit-tests-content').innerHTML = '<p class="text-gray-500 text-center py-4">No Unit Tests added yet</p>';
            document.getElementById('quarterly-content').innerHTML = '<p class="text-gray-500 text-center py-4">No Quarterly Tests added yet</p>';
            document.getElementById('half-yearly-content').innerHTML = '<p class="text-gray-500 text-center py-4">No Half Yearly Tests added yet</p>';
            document.getElementById('annually-content').innerHTML = '<p class="text-gray-500 text-center py-4">No Annual Tests added yet</p>';
            document.getElementById('revision-tests-content').innerHTML = '<p class="text-gray-500 text-center py-4">No Revision Tests added yet</p>';
            
            return;
        }
        
        // Convert marks object to array
        const marksArray = Object.values(marks);
        
        // Group marks by subject
        const subjectMarks = {};
        marksArray.forEach(mark => {
            if (!subjectMarks[mark.subjectId]) {
                subjectMarks[mark.subjectId] = [];
            }
            subjectMarks[mark.subjectId].push(mark);
        });
        
        // Group marks by test type for category tabs
        const unitTests = marksArray.filter(mark => mark.examType === 'Unit Test');
        const quarterlyTests = marksArray.filter(mark => mark.examType === 'Quarterly');
        const halfYearlyTests = marksArray.filter(mark => mark.examType === 'Half Yearly');
        const annualTests = marksArray.filter(mark => mark.examType === 'Annually');
        const revisionTests = marksArray.filter(mark => mark.examType === 'Revision Test');
        
        // Create summary for all tests
        const totalPercentage = marksArray.reduce((sum, mark) => sum + mark.percentage, 0);
        const averagePercentage = totalPercentage / marksArray.length;
        
        // Get counts for each test type
        const testTypeCounts = {
            'Unit Test': unitTests.length,
            'Quarterly': quarterlyTests.length,
            'Half Yearly': halfYearlyTests.length,
            'Annually': annualTests.length,
            'Revision Test': revisionTests.length,
            'Mid-Term': marksArray.filter(mark => mark.examType === 'Mid-Term').length
        };
        
        // Create all tests summary
        const allTestsSummary = document.createElement('div');
        allTestsSummary.className = 'bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg mb-5 border border-indigo-100';
        
        allTestsSummary.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Overall Performance Summary</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div class="bg-white p-3 rounded-lg shadow-sm text-center">
                    <p class="text-gray-500 text-sm">Overall Average</p>
                    <p class="text-${getPerformanceColor(averagePercentage)} text-xl font-bold">${averagePercentage.toFixed(1)}%</p>
                </div>
                <div class="bg-white p-3 rounded-lg shadow-sm text-center">
                    <p class="text-gray-500 text-sm">Total Assessments</p>
                    <p class="text-gray-800 text-xl font-bold">${marksArray.length}</p>
                </div>
                <div class="bg-white p-3 rounded-lg shadow-sm text-center">
                    <p class="text-gray-500 text-sm">Total Subjects</p>
                    <p class="text-gray-800 text-xl font-bold">${Object.keys(subjectMarks).length}</p>
                </div>
            </div>
            
            <h4 class="text-md font-semibold text-gray-700 mb-2">Test Type Distribution</h4>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-1">
                ${Object.entries(testTypeCounts)
                    .filter(([_, count]) => count > 0)
                    .map(([type, count]) => `
                        <div class="bg-white p-2 rounded-lg shadow-sm">
                            <div class="flex justify-between items-center">
                                <p class="text-gray-700 text-sm">${type}</p>
                                <p class="text-indigo-600 font-medium text-sm">${count}</p>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        `;
        
        // Add summary to the performance dashboard
        performanceDashboard.appendChild(allTestsSummary);
        
        // Create a heading for the subject cards
        const subjectsHeading = document.createElement('h4');
        subjectsHeading.className = 'text-md font-semibold text-gray-700 mb-3';
        subjectsHeading.textContent = 'Subject Performance';
        performanceDashboard.appendChild(subjectsHeading);
        
        // Render performance cards for each subject
        Object.values(subjectMarks).forEach(marks => {
            renderPerformanceCard(marks, performanceDashboard);
        });
        
        // Render category-specific cards
        renderCategoryCards(unitTests, 'unit-tests-content', 'Unit Tests');
        renderCategoryCards(quarterlyTests, 'quarterly-content', 'Quarterly Tests');
        renderCategoryCards(halfYearlyTests, 'half-yearly-content', 'Half Yearly Tests');
        renderCategoryCards(annualTests, 'annually-content', 'Annual Tests');
        renderCategoryCards(revisionTests, 'revision-tests-content', 'Revision Tests');
        
        // Update statistics
        updateStatistics(marksArray);
    } catch (error) {
        console.error('Error loading performance data:', error);
        showErrorNotification('Failed to load performance data');
    }
}

// Render cards for a specific test category
function renderCategoryCards(tests, containerId, categoryName) {
    const container = document.getElementById(containerId);
    
    // Check if there are any tests in this category
    if (tests.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-center py-4">No ${categoryName} added yet</p>`;
        return;
    }
    
    // Calculate summary statistics for this category
    const totalPercentage = tests.reduce((sum, test) => sum + test.percentage, 0);
    const averagePercentage = totalPercentage / tests.length;
    const highestMark = tests.reduce((highest, test) => test.percentage > highest.percentage ? test : highest, tests[0]);
    const lowestMark = tests.reduce((lowest, test) => test.percentage < lowest.percentage ? test : lowest, tests[0]);
    
    // Create summary section
    const summary = document.createElement('div');
    summary.className = 'bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg mb-5 border border-indigo-100';
    
    // Format test numbers if applicable
    let highestTestDisplay = highestMark.examType;
    if (highestMark.examNumber && (highestMark.examType === 'Mid-Term' || highestMark.examType === 'Unit Test' || highestMark.examType === 'Revision Test')) {
        highestTestDisplay = `${highestMark.examType} #${highestMark.examNumber}`;
    }
    
    let lowestTestDisplay = lowestMark.examType;
    if (lowestMark.examNumber && (lowestMark.examType === 'Mid-Term' || lowestMark.examType === 'Unit Test' || lowestMark.examType === 'Revision Test')) {
        lowestTestDisplay = `${lowestMark.examType} #${lowestMark.examNumber}`;
    }
    
    summary.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-800 mb-3">${categoryName} Summary</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div class="bg-white p-3 rounded-lg shadow-sm text-center">
                <p class="text-gray-500 text-sm">Average Performance</p>
                <p class="text-${getPerformanceColor(averagePercentage)} text-xl font-bold">${averagePercentage.toFixed(1)}%</p>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm text-center">
                <p class="text-gray-500 text-sm">Total Tests</p>
                <p class="text-gray-800 text-xl font-bold">${tests.length}</p>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm text-center">
                <p class="text-gray-500 text-sm">Subjects Covered</p>
                <p class="text-gray-800 text-xl font-bold">${new Set(tests.map(test => test.subjectId)).size}</p>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-white p-3 rounded-lg shadow-sm">
                <p class="text-gray-500 text-sm">Highest Mark</p>
                <div class="flex justify-between items-center mt-1">
                    <p class="text-gray-800">${highestMark.subjectName}</p>
                    <p class="text-green-500 font-medium">${highestMark.percentage.toFixed(1)}%</p>
                </div>
                <p class="text-gray-500 text-xs mt-1">${highestTestDisplay} • ${formatDate(highestMark.examDate)}</p>
            </div>
            <div class="bg-white p-3 rounded-lg shadow-sm">
                <p class="text-gray-500 text-sm">Lowest Mark</p>
                <div class="flex justify-between items-center mt-1">
                    <p class="text-gray-800">${lowestMark.subjectName}</p>
                    <p class="text-${getPerformanceColor(lowestMark.percentage)} font-medium">${lowestMark.percentage.toFixed(1)}%</p>
                </div>
                <p class="text-gray-500 text-xs mt-1">${lowestTestDisplay} • ${formatDate(lowestMark.examDate)}</p>
            </div>
        </div>
    `;
    
    // Add summary to container
    container.appendChild(summary);
    
    // Create a heading for the subject cards
    const subjectsHeading = document.createElement('h4');
    subjectsHeading.className = 'text-md font-semibold text-gray-700 mb-3';
    subjectsHeading.textContent = 'Subject Performance';
    container.appendChild(subjectsHeading);
    
    // Group tests by subject
    const subjectTests = {};
    tests.forEach(test => {
        if (!subjectTests[test.subjectId]) {
            subjectTests[test.subjectId] = [];
        }
        subjectTests[test.subjectId].push(test);
    });
    
    // Render subject cards
    Object.values(subjectTests).forEach(subjectTestGroup => {
        renderPerformanceCard(subjectTestGroup, container);
    });
}

// Render a performance card for a subject
function renderPerformanceCard(marks, container) {
    // Sort marks by date
    marks.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    
    // Calculate average percentage
    const totalPercentage = marks.reduce((sum, mark) => sum + mark.percentage, 0);
    const averagePercentage = totalPercentage / marks.length;
    
    // Get subject name from first mark
    const subjectName = marks[0].subjectName;
    
    // Create performance card
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-4 transition-all duration-300 hover:shadow-md';
    
    // Create card header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-3';
    header.innerHTML = `
        <h4 class="font-semibold text-gray-800">${subjectName}</h4>
        <div class="flex items-center gap-2">
            <p class="text-${getPerformanceColor(averagePercentage)} font-medium">
                ${averagePercentage.toFixed(1)}%
            </p>
            <button class="download-subject-marks-btn text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded" data-subject-id="${marks[0].subjectId}" data-subject-name="${subjectName}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
            </button>
        </div>
    `;
    
    // Create marks list
    const marksList = document.createElement('div');
    marksList.className = 'space-y-2';
    
    marks.forEach(mark => {
        const markItem = document.createElement('div');
        markItem.className = 'flex justify-between items-center text-sm border-b border-gray-100 pb-2';
        
        // Format exam type display to include exam number when applicable
        let examTypeDisplay = mark.examType;
        if (mark.examNumber && (mark.examType === 'Mid-Term' || mark.examType === 'Unit Test' || mark.examType === 'Revision Test')) {
            examTypeDisplay = `${mark.examType} #${mark.examNumber}`;
        }
        
        markItem.innerHTML = `
            <div>
                <p class="text-gray-700">${examTypeDisplay}</p>
                <p class="text-gray-500 text-xs">${formatDate(mark.examDate)}</p>
            </div>
            <div class="text-right flex items-center gap-2">
                <div>
                    <p class="font-medium">${mark.value}/${mark.maxMarks}</p>
                    <p class="text-${getPerformanceColor(mark.percentage)} text-xs">${mark.percentage.toFixed(1)}%</p>
                </div>
                <button class="download-mark-btn text-gray-500 hover:text-indigo-600" data-mark-id="${mark.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
            </div>
        `;
        
        // Add event listener for download mark button
        const downloadMarkBtn = markItem.querySelector('.download-mark-btn');
        downloadMarkBtn.addEventListener('click', () => downloadSingleMark(mark));
        
        marksList.appendChild(markItem);
    });
    
    // Add delete button for all marks
    const deleteAllBtn = document.createElement('button');
    deleteAllBtn.className = 'text-red-500 text-xs hover:text-red-700 mt-3';
    deleteAllBtn.textContent = 'Delete All Marks';
    deleteAllBtn.addEventListener('click', () => deleteAllSubjectMarks(marks[0].subjectId));
    
    // Assemble card
    card.appendChild(header);
    card.appendChild(marksList);
    card.appendChild(deleteAllBtn);
    
    // Add event listener for download subject marks button
    const downloadSubjectBtn = header.querySelector('.download-subject-marks-btn');
    downloadSubjectBtn.addEventListener('click', () => downloadSubjectMarks(marks));
    
    // Add to provided container
    container.appendChild(card);
}

// Update statistics based on marks data
function updateStatistics(marks) {
    // Clear statistics container
    statisticsContainer.innerHTML = '';
    
    // Calculate overall statistics
    const totalMarks = marks.length;
    const totalPercentage = marks.reduce((sum, mark) => sum + mark.percentage, 0);
    const averagePercentage = totalPercentage / totalMarks;
    
    // Find highest and lowest marks
    const highestMark = marks.reduce((highest, mark) => mark.percentage > highest.percentage ? mark : highest, marks[0]);
    const lowestMark = marks.reduce((lowest, mark) => mark.percentage < lowest.percentage ? mark : lowest, marks[0]);
    
    // Format exam type displays to include exam number when applicable
    let highestExamDisplay = highestMark.examType;
    if (highestMark.examNumber && (highestMark.examType === 'Mid-Term' || highestMark.examType === 'Unit Test' || highestMark.examType === 'Revision Test')) {
        highestExamDisplay = `${highestMark.examType} #${highestMark.examNumber}`;
    }
    
    let lowestExamDisplay = lowestMark.examType;
    if (lowestMark.examNumber && (lowestMark.examType === 'Mid-Term' || lowestMark.examType === 'Unit Test' || lowestMark.examType === 'Revision Test')) {
        lowestExamDisplay = `${lowestMark.examType} #${lowestMark.examNumber}`;
    }
    
    // Create statistics card
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-lg shadow-md';
    card.innerHTML = `
        <h4 class="font-semibold text-gray-800 mb-3">Performance Statistics</h4>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="text-center p-3 bg-gray-50 rounded">
                <p class="text-gray-500 text-sm">Overall Average</p>
                <p class="text-${getPerformanceColor(averagePercentage)} text-xl font-bold">${averagePercentage.toFixed(1)}%</p>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded">
                <p class="text-gray-500 text-sm">Total Assessments</p>
                <p class="text-gray-800 text-xl font-bold">${totalMarks}</p>
            </div>
        </div>
        
        <div class="space-y-3">
            <div>
                <p class="text-gray-600 text-sm">Highest Mark</p>
                <div class="flex justify-between items-center">
                    <p class="text-gray-800">${highestMark.subjectName} (${highestExamDisplay})</p>
                    <p class="text-green-500 font-medium">${highestMark.percentage.toFixed(1)}%</p>
                </div>
            </div>
            
            <div>
                <p class="text-gray-600 text-sm">Lowest Mark</p>
                <div class="flex justify-between items-center">
                    <p class="text-gray-800">${lowestMark.subjectName} (${lowestExamDisplay})</p>
                    <p class="text-${getPerformanceColor(lowestMark.percentage)} font-medium">${lowestMark.percentage.toFixed(1)}%</p>
                </div>
            </div>
        </div>
    `;
    
    // Add to statistics container
    statisticsContainer.appendChild(card);
}

// Analyze performance
function analyzePerformance() {
    // This function would provide more detailed analysis
    // For now, we'll just show a notification
    showInfoNotification('Performance analysis feature coming soon!');
}

// Delete all marks for a subject
async function deleteAllSubjectMarks(subjectId) {
    if (!confirm('Are you sure you want to delete all marks for this subject?')) {
        return;
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        // Get marks for this subject
        const marksSnapshot = await marksRef.child(user.uid).orderByChild('subjectId').equalTo(subjectId).once('value');
        const marks = marksSnapshot.val() || {};
        
        // Delete each mark
        const deletePromises = Object.keys(marks).map(markId => {
            return marksRef.child(user.uid).child(markId).remove();
        });
        
        await Promise.all(deletePromises);
        
        // Show success message
        showSuccessNotification('Marks deleted successfully');
        
        // Refresh performance data
        loadPerformanceData();
    } catch (error) {
        console.error('Error deleting marks:', error);
        showErrorNotification('Failed to delete marks');
    }
}

// Helper function to generate a unique ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Helper function to format a date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Helper function to get color based on performance percentage
function getPerformanceColor(percentage) {
    if (percentage >= 80) return 'green-500';
    if (percentage >= 60) return 'yellow-500';
    return 'red-500';
}

// Handle exam type change to show/hide the exam number input
function handleExamTypeChange() {
    const examType = document.getElementById('exam-type').value;
    const examNumberContainer = document.getElementById('exam-number-container');
    
    // Show exam number input for specific exam types
    if (examType === 'Mid-Term' || examType === 'Unit Test' || examType === 'Revision Test') {
        examNumberContainer.classList.remove('hidden');
        document.getElementById('exam-number').required = true;
        document.getElementById('exam-number').value = ''; // Clear any previous value
        
        // Show an info notification about test number
        showInfoNotification(`Please enter a unique test number for this ${examType}.`);
        
        // Focus on the exam number input field
        setTimeout(() => {
            document.getElementById('exam-number').focus();
        }, 100);
    } else {
        examNumberContainer.classList.add('hidden');
        document.getElementById('exam-number').required = false;
    }
}

// Handle subject selection change to update available exam types
async function handleSubjectChange() {
    const subjectSelect = document.getElementById('mark-subject');
    const examTypeSelect = document.getElementById('exam-type');
    const selectedSubjectId = subjectSelect.value;
    
    if (!selectedSubjectId) {
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        return;
    }
    
    try {
        // Get all marks for this subject
        const marksSnapshot = await marksRef.child(user.uid).once('value');
        const marks = marksSnapshot.val() || {};
        
        // Filter marks to only include the selected subject
        const subjectMarks = Object.values(marks).filter(mark => mark.subjectId === selectedSubjectId);
        
        // Get unique exam types already used for this subject
        const usedExamTypes = subjectMarks.map(mark => mark.examType);
        
        // Reset exam type dropdown
        examTypeSelect.innerHTML = '<option value="">Select Type</option>';
        
        // Get subject name
        const subjectName = subjectSelect.options[subjectSelect.selectedIndex].text;
        
        // Show warning if unique exam types are already used
        const uniqueExamTypes = ['Quarterly', 'Half Yearly', 'Annually'];
        const usedUniqueTypes = uniqueExamTypes.filter(type => usedExamTypes.includes(type));
        
        if (usedUniqueTypes.length > 0) {
            showWarningNotification(`Subject "${subjectName}" already has ${usedUniqueTypes.join(', ')} tests recorded.`);
        }
        
        // Add exam type options
        const examTypes = [
            { value: 'Unit Test', label: 'Unit Test', unique: false },
            { value: 'Quarterly', label: 'Quarterly', unique: true },
            { value: 'Half Yearly', label: 'Half Yearly', unique: true },
            { value: 'Annually', label: 'Annually', unique: true },
            { value: 'Mid-Term', label: 'Mid-Term', unique: false },
            { value: 'Revision Test', label: 'Revision Test', unique: false }
        ];
        
        examTypes.forEach(type => {
            // For unique exam types, only add if not already used
            if (type.unique && usedExamTypes.includes(type.value)) {
                return;
            }
            
            const option = document.createElement('option');
            option.value = type.value;
            option.textContent = type.label;
            examTypeSelect.appendChild(option);
        });
        
        // Reset the exam number field
        const examNumberContainer = document.getElementById('exam-number-container');
        examNumberContainer.classList.add('hidden');
        document.getElementById('exam-number').required = false;
        
    } catch (error) {
        console.error('Error updating exam types:', error);
        showErrorNotification('Error loading exam types. Please try again.');
    }
}

// Switch between performance tabs
function switchPerformanceTab(tabId) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.performance-tab-content');
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tabs and hide indicator dots
    const tabs = document.querySelectorAll('.performance-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active', 'text-indigo-600', 'border-indigo-600');
        tab.classList.add('hover:text-gray-600', 'hover:border-gray-300', 'border-transparent');
        
        // Hide indicator dot
        const indicatorDot = tab.querySelector('span');
        if (indicatorDot) {
            indicatorDot.classList.add('opacity-0');
        }
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabId}-tab`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Set active tab and show indicator dot
    const activeTab = document.querySelector(`.performance-tab[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('active', 'text-indigo-600', 'border-indigo-600');
        activeTab.classList.remove('hover:text-gray-600', 'hover:border-gray-300', 'border-transparent');
        
        // Show indicator dot
        const indicatorDot = activeTab.querySelector('span');
        if (indicatorDot) {
            indicatorDot.classList.remove('opacity-0');
        }
    }
}

// Download a single mark entry as a text file
function downloadSingleMark(mark) {
    // Format exam type display to include exam number when applicable
    let examTypeDisplay = mark.examType;
    if (mark.examNumber && (mark.examType === 'Mid-Term' || mark.examType === 'Unit Test' || mark.examType === 'Revision Test')) {
        examTypeDisplay = `${mark.examType} #${mark.examNumber}`;
    }
    
    // Create file content
    let content = `MARK DETAILS\n`;
    content += `===================\n\n`;
    content += `Subject: ${mark.subjectName}\n`;
    content += `Test Type: ${examTypeDisplay}\n`;
    content += `Date: ${formatDate(mark.examDate)}\n`;
    content += `Marks: ${mark.value}/${mark.maxMarks}\n`;
    content += `Percentage: ${mark.percentage.toFixed(1)}%\n`;
    
    // Create a filename
    const filename = `${mark.subjectName}_${examTypeDisplay.replace(/\s+/g, '_')}_${mark.examDate}.txt`;
    
    // Download the file
    downloadTextFile(content, filename);
    
    // Show success notification
    showSuccessNotification(`Mark data for ${mark.subjectName} - ${examTypeDisplay} downloaded successfully`);
}

// Download marks for a specific subject
function downloadSubjectMarks(marks) {
    // Get subject name from first mark
    const subjectName = marks[0].subjectName;
    
    // Create file content
    let content = `SUBJECT MARKS: ${subjectName}\n`;
    content += `===================\n\n`;
    
    // Calculate summary statistics
    const totalPercentage = marks.reduce((sum, mark) => sum + mark.percentage, 0);
    const averagePercentage = totalPercentage / marks.length;
    
    content += `Total Tests: ${marks.length}\n`;
    content += `Average Percentage: ${averagePercentage.toFixed(1)}%\n\n`;
    content += `INDIVIDUAL TEST MARKS\n`;
    content += `===================\n\n`;
    
    // Add each mark
    marks.forEach((mark, index) => {
        // Format exam type display to include exam number when applicable
        let examTypeDisplay = mark.examType;
        if (mark.examNumber && (mark.examType === 'Mid-Term' || mark.examType === 'Unit Test' || mark.examType === 'Revision Test')) {
            examTypeDisplay = `${mark.examType} #${mark.examNumber}`;
        }
        
        content += `Test ${index + 1}: ${examTypeDisplay}\n`;
        content += `Date: ${formatDate(mark.examDate)}\n`;
        content += `Marks: ${mark.value}/${mark.maxMarks}\n`;
        content += `Percentage: ${mark.percentage.toFixed(1)}%\n\n`;
    });
    
    // Create a filename
    const filename = `${subjectName}_All_Marks.txt`;
    
    // Download the file
    downloadTextFile(content, filename);
    
    // Show success notification
    showSuccessNotification(`All marks for ${subjectName} downloaded successfully`);
}

// Download all marks data
async function downloadMarksData() {
    const user = auth.currentUser;
    if (!user) {
        showErrorNotification('You must be logged in to download marks');
        return;
    }
    
    try {
        // Get all marks from Firebase
        const marksSnapshot = await marksRef.child(user.uid).once('value');
        const marks = marksSnapshot.val() || {};
        
        // Check if there are any marks
        if (Object.keys(marks).length === 0) {
            showErrorNotification('No marks data available to download');
            return;
        }
        
        // Convert marks object to array
        const marksArray = Object.values(marks);
        
        // Group marks by subject
        const subjectMarks = {};
        marksArray.forEach(mark => {
            if (!subjectMarks[mark.subjectId]) {
                subjectMarks[mark.subjectId] = [];
            }
            subjectMarks[mark.subjectId].push(mark);
        });
        
        // Create file content
        let content = `MARKS DATA REPORT\n`;
        content += `===================\n\n`;
        content += `Total Subjects: ${Object.keys(subjectMarks).length}\n`;
        content += `Total Tests: ${marksArray.length}\n\n`;
        
        // Add subject-wise marks
        Object.entries(subjectMarks).forEach(([subjectId, subjectMarkList]) => {
            // Get subject name from first mark
            const subjectName = subjectMarkList[0].subjectName;
            
            // Calculate subject average
            const totalPercentage = subjectMarkList.reduce((sum, mark) => sum + mark.percentage, 0);
            const averagePercentage = totalPercentage / subjectMarkList.length;
            
            content += `SUBJECT: ${subjectName}\n`;
            content += `Average: ${averagePercentage.toFixed(1)}%\n`;
            content += `Tests: ${subjectMarkList.length}\n\n`;
            
            // Add individual marks
            subjectMarkList.forEach((mark, index) => {
                // Format exam type display to include exam number when applicable
                let examTypeDisplay = mark.examType;
                if (mark.examNumber && (mark.examType === 'Mid-Term' || mark.examType === 'Unit Test' || mark.examType === 'Revision Test')) {
                    examTypeDisplay = `${mark.examType} #${mark.examNumber}`;
                }
                
                content += `  Test ${index + 1}: ${examTypeDisplay}\n`;
                content += `  Date: ${formatDate(mark.examDate)}\n`;
                content += `  Marks: ${mark.value}/${mark.maxMarks}\n`;
                content += `  Percentage: ${mark.percentage.toFixed(1)}%\n\n`;
            });
            
            content += `----------------------------\n\n`;
        });
        
        // Add overall performance statistics
        const totalPercentage = marksArray.reduce((sum, mark) => sum + mark.percentage, 0);
        const overallAverage = totalPercentage / marksArray.length;
        
        content += `OVERALL PERFORMANCE\n`;
        content += `===================\n\n`;
        content += `Overall Average: ${overallAverage.toFixed(1)}%\n\n`;
        
        // Create a filename with date
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const filename = `All_Marks_Data_${dateStr}.txt`;
        
        // Download the file
        downloadTextFile(content, filename);
        
        // Show success notification
        showSuccessNotification('All marks data downloaded successfully');
    } catch (error) {
        console.error('Error downloading marks data:', error);
        showErrorNotification('Failed to download marks data. Please try again.');
    }
}

// Helper function to download a text file
function downloadTextFile(content, filename) {
    // Create a blob from the content
    const blob = new Blob([content], { type: 'text/plain' });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Add to document, click to download, and remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up by revoking the URL
    URL.revokeObjectURL(url);
}