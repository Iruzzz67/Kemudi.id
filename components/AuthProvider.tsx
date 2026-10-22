"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { StudentProfile } from "@/types/ui";
import { Car } from "lucide-react";

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  nik?: string;
};

type AuthContextType = {
  user: User | null;
  studentProfile: StudentProfile;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password?: string) => Promise<{ error?: string }>;
  updateProfile: (profile: Partial<StudentProfile>) => void;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
};

const DEFAULT_PROFILE: StudentProfile = {
  name: "Aldiansyah Reza",
  email: "aldiansyahrzz45@gmail.com",
  phone: "0812-9876-5432",
  // NIK sensitif tidak disimpan sebagai default — dikosongkan.
  nik: "",
  address: "Jl. Margonda Raya No. 45, Beji, Depok",
  registeredCourseId: "intensif-mobil",
  selectedMentorId: "budi",
  paymentMethod: "qris",
  paymentStatus: "terverifikasi",
  registrationDate: "05 Oktober 2026",
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  studentProfile: DEFAULT_PROFILE,
  loading: true,
  login: async () => ({}),
  register: async () => ({}),
  updateProfile: () => {},
  loginAsDemo: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_PATHS = ["/login", "/register"];

const emptySubscribe = () => () => {};

export function AuthProvider({ children }: { children: ReactNode }) {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const loading = !isHydrated;

  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const savedUser = localStorage.getItem("kemudi_auth_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) return parsed;
      }
    } catch (err) {
      // JSON korup jangan ditelan diam-diam: reset aman + log.
      console.warn("[Auth] data user korup, reset penyimpanan lokal.", err);
      try {
        localStorage.removeItem("kemudi_auth_user");
      } catch {}
    }
    return null;
  });

  const [studentProfile, setStudentProfile] = useState<StudentProfile>(() => {
    if (typeof window === "undefined") return DEFAULT_PROFILE;
    let current = DEFAULT_PROFILE;
    try {
      const savedProfile = localStorage.getItem("kemudi_student_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed && parsed.name) current = { ...DEFAULT_PROFILE, ...parsed };
      }
      const savedUser = localStorage.getItem("kemudi_auth_user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.email) {
          current = {
            ...current,
            name: parsedUser.name || current.name,
            email: parsedUser.email || current.email,
            phone: parsedUser.phone || current.phone,
            nik: parsedUser.nik || current.nik,
          };
        }
      }
    } catch (err) {
      console.warn("[Auth] data profil korup, kembali ke profil default.", err);
      try {
        localStorage.removeItem("kemudi_student_profile");
        localStorage.removeItem("kemudi_auth_user");
      } catch {}
      current = DEFAULT_PROFILE;
    }
    return current;
  });

  const pathname = usePathname();
  const router = useRouter();

  // Auth Guard: enforce login requirement for all protected pages
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    if (!user && !isPublic) {
      const callbackUrl = encodeURIComponent(pathname);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
    } else if (user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  const updateProfile = (updatedData: Partial<StudentProfile>) => {
    setStudentProfile((prev) => {
      const merged: StudentProfile = {
        ...prev,
        ...updatedData,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("kemudi_student_profile", JSON.stringify(merged));
      }

      // Also sync user state
      setUser((prevUser) => {
        if (!prevUser) return null;
        const updatedUser: User = {
          ...prevUser,
          name: merged.name || prevUser.name,
          email: merged.email || prevUser.email,
          phone: merged.phone || prevUser.phone,
          nik: merged.nik || prevUser.nik,
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("kemudi_auth_user", JSON.stringify(updatedUser));
        }
        return updatedUser;
      });

      return merged;
    });
  };

  const login = async (email: string, password?: string) => {
    if (!email || !email.includes("@")) {
      return { error: "Silakan masukkan format email yang valid." };
    }
    if (password !== undefined && password.length > 0 && password.length < 6) {
      return { error: "Password minimal 6 karakter." };
    }

    let name = email.split("@")[0];
    name = name.charAt(0).toUpperCase() + name.slice(1);

    // If there's an existing registered profile matching this email
    if (typeof window !== "undefined") {
      const savedProfile = localStorage.getItem("kemudi_student_profile");
      if (savedProfile) {
        try {
          const parsed: StudentProfile = JSON.parse(savedProfile);
          if (parsed.email.toLowerCase() === email.toLowerCase() && parsed.name) {
            name = parsed.name;
          }
        } catch (err) {
          console.warn("[Auth] profil tersimpan korup saat login, reset.", err);
          try {
            localStorage.removeItem("kemudi_student_profile");
          } catch {}
        }
      }
    }

    const newUser: User = {
      id: "usr_" + Date.now(),
      name,
      email: email.trim().toLowerCase(),
      phone: studentProfile.phone || "0812-9876-5432",
    };

    const newProfile: StudentProfile = {
      ...studentProfile,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || studentProfile.phone,
    };

    setUser(newUser);
    setStudentProfile(newProfile);

    if (typeof window !== "undefined") {
      localStorage.setItem("kemudi_auth_user", JSON.stringify(newUser));
      localStorage.setItem("kemudi_student_profile", JSON.stringify(newProfile));
    }
    return {};
  };

  const register = async (name: string, email: string, password?: string) => {
    if (!name || name.trim().length < 2) {
      return { error: "Nama lengkap harus diisi (minimal 2 karakter)." };
    }
    if (!email || !email.includes("@")) {
      return { error: "Silakan masukkan format email yang valid." };
    }
    if (password !== undefined && password.length < 6) {
      return { error: "Password minimal 6 karakter." };
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const newUser: User = {
      id: "usr_" + Date.now(),
      name: trimmedName,
      email: trimmedEmail,
      phone: "0812-9876-5432",
    };

    const newProfile: StudentProfile = {
      name: trimmedName,
      email: trimmedEmail,
      phone: "0812-9876-5432",
      nik: "",
      address: "",
      registeredCourseId: "intensif-mobil",
      selectedMentorId: "budi",
      paymentMethod: "qris",
      paymentStatus: "terverifikasi",
      registrationDate: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };

    setUser(newUser);
    setStudentProfile(newProfile);

    if (typeof window !== "undefined") {
      localStorage.setItem("kemudi_auth_user", JSON.stringify(newUser));
      localStorage.setItem("kemudi_student_profile", JSON.stringify(newProfile));
    }
    return {};
  };

  const loginAsDemo = async () => {
    const demoUser: User = {
      id: "demo_student_01",
      name: "Aldiansyah Reza",
      email: "aldiansyahrzz45@gmail.com",
      phone: "0812-9876-5432",
    };
    setUser(demoUser);
    setStudentProfile(DEFAULT_PROFILE);

    if (typeof window !== "undefined") {
      localStorage.setItem("kemudi_auth_user", JSON.stringify(demoUser));
      localStorage.setItem("kemudi_student_profile", JSON.stringify(DEFAULT_PROFILE));
    }
  };

  const logout = async () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("kemudi_auth_user");
    }
    router.replace("/login");
  };

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!isPublic && (loading || !user)) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-neutral-950 transition-colors">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg animate-bounce">
            <Car className="w-7 h-7" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Kemudi<span className="text-blue-600 dark:text-blue-500">.id</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Memeriksa otentikasi akun...
            </p>
          </div>
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user: loading ? null : user,
        studentProfile: loading ? DEFAULT_PROFILE : studentProfile,
        loading,
        login,
        register,
        updateProfile,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
