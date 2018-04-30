const { client } = require('./lib')

/* Can be used to index an array by id */
const index = (input, column) => input.reduce((previous, current) => ({ ...previous, [current[column]]: current }), {})

function sql() {
  const queryStart = new Date()

  client.query(`
    SELECT
      students.id,
      students.name AS student_name,
      cohorts.name AS cohort_name
    FROM students
    JOIN cohorts ON cohorts.id = students.cohort_id
  `).then(result => {
    console.log(`SQL Query : ${new Date() - queryStart}ms`)
  })
}

function javascript(input) {
  /* FROM students */
  const result = input.students.map(student => {
    /* JOIN cohorts ON cohort.id = students.cohort_id */
    const cohort = input.cohorts.find(cohort => {
      return cohort.id === student.cohort_id
    })

    /* SELECT
         students.id,
         students.name AS student_name,
         cohorts.name AS cohort_name
    */
    return {
      id: student.id,
      student_name: student.name,
      cohort_name: cohort.name
    }
  })

  console.log(`Basic Query: ${new Date() - basicStart}ms`)

  return result
}

const basicStart = new Date()

Promise.all([
  client.query('SELECT * FROM students'),
  client.query('SELECT * FROM cohorts')
]).then(([students, cohorts]) => {
  javascript({
    students: students.rows,
    cohorts: cohorts.rows
  })

  sql()
})
