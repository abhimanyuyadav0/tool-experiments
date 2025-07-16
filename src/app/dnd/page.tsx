'use client'

import { useState } from 'react'
import { GripVertical, Circle, Clock, CheckCircle, Star, Archive } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@nmspl/nm-ui-lib'

type Task = {
  id: string
  title: string
  status: Status
}

type Status = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'archived'

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Design new homepage', status: 'backlog' },
    { id: '2', title: 'Implement authentication', status: 'todo' },
    { id: '3', title: 'Fix mobile layout issues', status: 'in-progress' },
    { id: '4', title: 'Write API documentation', status: 'review' },
    { id: '5', title: 'Update dependencies', status: 'done' },
    { id: '6', title: 'Conduct usability testing', status: 'backlog' },
    { id: '7', title: 'Refactor payment module', status: 'todo' },
    { id: '8', title: 'Optimize images for performance', status: 'in-progress' },
    { id: '9', title: 'Setup CI/CD pipeline', status: 'review' },
    { id: '10', title: 'Cleanup old branches', status: 'archived' },
  ])

  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: Status) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, status: Status) => {
    e.preventDefault()
    if (draggedTask) {
      const updatedTasks = tasks.map(task =>
        task.id === draggedTask.id ? { ...task, status } : task
      )
      setTasks(updatedTasks)
      console.log(`Task "${draggedTask.title}" moved to "${getStatusTitle(status)}"`)
      await dummyApiCall(draggedTask.id, status)
      alert(`Final data submitted:\n${JSON.stringify(updatedTasks, null, 2)}`)
      setDraggedTask(null)
    }
  }

  const dummyApiCall = async (taskId: string, newStatus: Status) => {
    console.log(`📡 Simulating API call for task ${taskId} -> status "${newStatus}"...`)
    return new Promise(resolve => setTimeout(() => {
      console.log(`✅ Dummy API call completed for task ${taskId}`)
      resolve(true)
    }, 1000))
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'backlog': return 'bg-yellow-100'
      case 'todo': return 'bg-gray-200'
      case 'in-progress': return 'bg-blue-200'
      case 'review': return 'bg-purple-200'
      case 'done': return 'bg-green-200'
      case 'archived': return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case 'backlog': return <Star className="w-4 h-4" />
      case 'todo': return <Circle className="w-4 h-4" />
      case 'in-progress': return <Clock className="w-4 h-4" />
      case 'review': return <Clock className="w-4 h-4 animate-pulse" />
      case 'done': return <CheckCircle className="w-4 h-4" />
      case 'archived': return <Archive className="w-4 h-4" />
    }
  }

  const getStatusTitle = (status: Status) => {
    switch (status) {
      case 'backlog': return 'Backlog'
      case 'todo': return 'To Do'
      case 'in-progress': return 'In Progress'
      case 'review': return 'Review'
      case 'done': return 'Done'
      case 'archived': return 'Archived'
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Task Board</h1>

      <div className="flex overflow-x-auto space-x-4">
        {(['backlog', 'todo', 'in-progress', 'review', 'done', 'archived'] as Status[]).map((status) => (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
            className={`flex-shrink-0 w-[85vw] sm:w-[60vw] md:w-[300px] lg:w-[300px] rounded-lg border ${
              draggedTask?.status === status ? 'border-dashed border-blue-500' : 'border-gray-200'
            }`}
          >
            <Card className="h-full">
              <CardHeader className={`${getStatusColor(status)} rounded-t-lg`}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  {getStatusTitle(status)}
                  <span className="ml-auto text-sm font-normal">
                    ({tasks.filter(t => t.status === status).length})
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 min-h-[200px]">
                {tasks
                  .filter(task => task.status === status)
                  .map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className="p-3 bg-white rounded border border-gray-200 shadow-sm flex items-start gap-2 cursor-move hover:shadow-md transition-shadow"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {getStatusTitle(task.status)}
                        </p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
