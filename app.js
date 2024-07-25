const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// MySQL database configuration
const db = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '20191201',
    database: 'mydb'
}).promise();

// Middleware to check user role
async function checkUserRole(req, res, next) {
    const { UserID } = req.body;  // assuming UserID is passed in the request body
    if (!UserID) {
        return res.status(400).send('Bad Request: UserID is required');
    }
    try {
        const [rows] = await db.execute('SELECT Role FROM roles WHERE RoleID = (SELECT RoleID FROM users WHERE UserID = ?)', [UserID]);
        if (rows.length === 0) {
            return res.status(404).send('User not found');
        }
        req.userRole = rows[0]?.Role; 
        next();  
    } catch (error) {
        console.error('Error in checkUserRole middleware:', error);
        res.status(500).send('Server Error');
    }
}

// Middleware to authorize based on roles
function authorize(roles) {
    return (req, res, next) => {
        if (!req.userRole) {
            return res.status(500).send('Internal Server Error: User role not set');
        }
        if (!roles.includes(req.userRole)) {
            return res.status(403).send('Forbidden: You do not have the required permissions');
        }
        next(); 
    };
}

// Route handlers
app.post('/assign-course', checkUserRole, authorize(['Admin']), async (req, res) => {
    const { teacherid, courseId } = req.body;
    try {
        await db.execute('INSERT INTO enrolments (UserID, CourseID, Mark) VALUES (?, ?, ?)', [teacherid, courseId, -1]);
        res.send('Course assigned to student');
    } catch (error) {
        console.error('Error in /assign-course route:', error);
        res.status(500).send('Server Error');
    }
});

app.post('/courses-availability/:courseId', checkUserRole, authorize(['Admin']), async (req, res) => {
    const { courseId } = req.params;
    const { isAvailable } = req.body;
    try {
        await db.execute('UPDATE courses SET isAvailable = ? WHERE CourseID = ?', [isAvailable, courseId]);
        res.json({ message: 'Availability updated' });
    } catch (error) {
        console.error('Error in /courses-availability route:', error);
        res.status(500).send('Server Error');
    }
});

app.post('/update-status', checkUserRole, authorize(['Teacher']), async (req, res) => {
    const { userId, studentid, mark ,courseId} = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM courses WHERE TeacherID = ? AND CourseID = ?)', [userId, courseId]);
        if (rows.length === 0) {
            return res.status(404).send('Teacher has no permission to update this course');
        }
        const sql = 'UPDATE enrolments SET Mark = ? WHERE UserID = ? AND CourseID = ?';
        await db.execute(sql, [mark, studentid, courseId]);
        res.send('Course status updated');
    } catch (error) {
        console.error('Error in /update-status route:', error);
        res.status(500).send('Server Error');
    }
});

app.get('/courses', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT CourseID, Title, TeacherID FROM courses WHERE isAvailable = 1');
        res.json(rows);
    } catch (error) {
        console.error('Error in /courses route:', error);
        res.status(500).send('Server Error');
    }
});

app.post('/enrollments', checkUserRole, authorize(['Student']), async (req, res) => {
    const { courseId, userId } = req.body;
    try {
        const [enrollment] = await db.execute('SELECT * FROM enrolments WHERE CourseID = ? AND UserID = ?', [courseId, userId]);
        if (enrollment.length > 0) {
            res.status(400).send('Already Enrolled Before');
        } else {
            await db.execute('INSERT INTO enrolments (CourseID, UserID) VALUES (?, ?)', [courseId, userId]);
            res.json({ message: 'Successful' });
        }
    } catch (error) {
        console.error('Error in /enrollments route:', error);
        res.status(500).send('Server Error');
    }
});

// Testing endpoint with query parameter
app.get('/', (req, res) => {
    const { UserID } = req.query;
    res.send(`UserID: ${UserID}`);
});

app.get('/test', (req, res) => {
    const { UserID } = req.query;
    res.send(`UserID: ${UserID}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
