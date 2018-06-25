const { client } = require('./lib')

function sql() {
  const queryStart = new Date()

  client.query(`
    SELECT
      students.id,
      students.name,
      count(assignment_submissions.id) as assignments_complete
    FROM students
    JOIN assignment_submissions
    ON assignment_submissions.student_id = students.id
    GROUP BY students.id
  `).then(result => {
    console.log(`SQL Query : ${new Date() - queryStart}ms`)

    client.end()
  })
}

function javascript(input) {
  /* FROM students */
  const result = input.students.map(student => {
    /* JOIN assignment_submissions ON assignment_submissions.student_id = students.id */
    const submissions = input.assignment_submissions.filter(submission => {
      return submission.student_id === student.id
    }).length

    /* Not a bad place to use an index instead. */

    /* SELECT
         students.id,
         students.name,
         count(assignment_submissions.id) as assignments_complete
    */
    return {
      id: student.id,
      student_name: student.name,
      assignments_complete: submissions
    }
  })

  console.log(`Basic Query: ${new Date() - basicStart}ms`)

  return result
}

const basicStart = new Date()

Promise.all([
  client.query('SELECT * FROM students'),
  client.query('SELECT * FROM assignment_submissions')
]).then(([students, assignment_submissions]) => {
  javascript({
    students: students.rows,
    assignment_submissions: assignment_submissions.rows
  })

  sql()
})

