"use client"

interface Employee {
  id: string
  name: string
  location: string
  totalHours: number
}

interface EmployeeTableProps {
  employees: Employee[]
}

export default function EmployeeTable({ employees }: EmployeeTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-semibold text-foreground">Employee</th>
            <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
            <th className="text-right py-3 px-4 font-semibold text-foreground">Hours</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const isOvertime = emp.totalHours > 40
            return (
              <tr key={emp.id} className={`border-b border-border ${isOvertime ? "bg-destructive/10" : ""}`}>
                <td className="py-3 px-4">{emp.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{emp.location}</td>
                <td
                  className={`py-3 px-4 text-right font-semibold ${isOvertime ? "text-destructive" : "text-foreground"}`}
                >
                  {emp.totalHours.toFixed(2)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
