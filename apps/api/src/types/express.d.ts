// Hydrate the response locals with the resolved school.
declare namespace Express {
  interface Locals {
    school: School
  }
}
