import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 items-center">
      <input type="text" className="border border-gray-300 rounded-md p-2" />
      <button className="bg-blue-500 text-white rounded-md p-2">Submit</button>
    </div>
  );
}
