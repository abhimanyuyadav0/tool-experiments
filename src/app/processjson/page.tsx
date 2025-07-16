import TaskBoardClient from "./TaskBoardClient";

export default function TaskBoardPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-black">
      <h1 className="text-xl text-white font-semibold mb-4">
        User data processing...
      </h1>
      <div className="">
        <TaskBoardClient />
      </div>
    </div>
  );
}
