import { useRouter } from "next/navigation";
import { Group } from "@/lib/hooks/use-app-data";

interface GroupsTabProps {
  groups: Group[];
  onOpenCreateGroup: () => void;
}

const GROUP_IMAGES = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCESQZpPFHiV1CVbNCsfFVgpQkuGWCkY3iUVijNCus5_cQZpSXHptN0PCjFia1eh2QFOVcoIkLSPrxKdFhKVSe1PShIGavv2nRnG50AwL7ZKiQghHbhisGS2QUlz8rqJ6EgMYK4stJCGSZzGBM1v2lhqdyClBwrGPAnYFtNzHEWddSdPkr0yetyNuE0xfPfGrs5WIlL7onYTZt6XKrrTOy3qx13LCx-T8E_wsyXtJGbn8DOszJeh-qRPeH-4K_LM8YwXlU6_oCmIkE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCYOIaWid8x5ZNElc46aBfNYCLI5VRkmZqLjiTO5VRDSZLMY6g2UwzYVgs_ktJYJNKiobRLrCe-1LnIJ6Vxif9j0v0N1-SfMAWxp-FobOEpm4W-5hul4oue2crzq0aLj5vSoINMd4BlEA-9WMeMfoGa1UR8M9wAGblOp-6ic5MUKRPdBg2mMF0VPYQNTTvj9cuEMND828JCFpk3N3ngoMT9BS56oi_7fHFyq_XFK0rDelemm3QlDyoFkgw2xrY5inxoTs2eWA_Fzhc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuArCk4zl2q4IzgJWDzX6F5XhUle7GlLV8ICgjH3k1IbH9r96gcUnVLLYZgqYgOIiObmX1BaWDFuR4Gl1WHvD7B7Kbzmpi7v8550CiWabq8-XtijDWYE2d9E58SmjRlBkRt7zEF_bWDtQojygQIFDo6yGoQVw7U_Amp8LK9guW1fzglGUcG4n9W3JrFqBtDt9U1FUtet-bY7UpkwpTe39oaibdfniAFqxMUdDaDig4u-eXiubiTgve7bwEuF8j0X4eBULEJvLMSUFVc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAbVRdc680yL2hY0vZiC1sZ2cVkw3zsfz0OHHSpw81Y9OUe_TtuCdMgzvxYqNBwLo4tPNaD3oI2BME-5H_XFUvpsOAMxo4tx5Ca2io6Il86gzjAXBG0vACqiw-eeU1fULlgtAjrShGO83YKtjAeSc64aYRxTr_kIMXTjXdTNweiByxwHsknnrQmeRgnbsk3BfSlB_8J_y_ocHsb20vNkXTusM7bCzAHYNoFZM0xycfpnjgMeLfs8pBqj-Obez-DNE0v8CVu5puolMc",
];

export function GroupsTab({ groups, onOpenCreateGroup }: GroupsTabProps) {
  const router = useRouter();

  return (
    <main className="flex-1 px-5 mt-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-extrabold text-gray-800">Nhóm của bạn</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Create new group card */}
        <button
          onClick={onOpenCreateGroup}
          className="rounded-[2.5rem] p-4 flex flex-col items-center justify-center border-2 border-dashed border-[#b3e5d1] bg-white/60 min-h-[180px] transition-all active:scale-95"
        >
          <div className="w-14 h-14 rounded-full bg-[#B3E5D1] flex items-center justify-center mb-3 shadow-sm">
            <svg
              className="w-7 h-7 text-[#437d6e]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-700">Tạo Nhóm Mới</p>
          <p className="text-xs text-gray-400 mt-1 text-center">
            Bắt đầu chia sẻ chi phí
          </p>
        </button>

        {/* Group cards */}
        {groups.map((group, idx) => (
          <button
            key={group.id}
            onClick={() => router.push(`/groups/${group.id}`)}
            className="rounded-[2.5rem] p-4 flex flex-col text-left shadow-sm border-2 border-[#ffd8c2] bg-[#FFF9EF] transition-all active:scale-95"
          >
            <div className="rounded-3xl w-full aspect-square overflow-hidden mb-3">
              <img
                src={GROUP_IMAGES[idx % GROUP_IMAGES.length]}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">
              {group.name}
            </h3>
            <div className="flex items-center gap-1 mt-2">
              <span className="bg-[#e8f5f1] p-1 rounded text-emerald-600">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                  />
                </svg>
              </span>
              <p className="text-[11px] text-gray-500">
                {group.memberCount} thành viên
              </p>
            </div>
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-[#B3E5D1] flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-[#437d6e]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>
          <p className="font-bold text-gray-700 text-lg">Chưa có nhóm nào</p>
          <p className="text-sm text-gray-400 mt-1">
            Tạo nhóm đầu tiên để bắt đầu!
          </p>
        </div>
      )}
    </main>
  );
}
