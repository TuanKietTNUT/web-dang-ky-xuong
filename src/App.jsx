import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {
  Wrench,
  Users,
  UserCog,
  Calendar,
  ShieldCheck,
  ArrowLeft,
  Check,
  Trash2,
  Search,
  BookOpen,
  Clock,
  AlertCircle,
  Settings,
  ClipboardList,
} from 'lucide-react';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: 'AIzaSyAcH12rnMGP3WiY52358GSdUfCd1GJ3H1o',
  authDomain: 'web-dang-ki-thuc-hanh.firebaseapp.com',
  projectId: 'web-dang-ki-thuc-hanh',
  storageBucket: 'web-dang-ki-thuc-hanh.firebasestorage.app',
  messagingSenderId: '1085064375724',
  appId: '1:1085064375724:web:e1590bd027a85c312a1e09',
  measurementId: 'G-92CP40XZRN',
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId =
  typeof __app_id !== 'undefined' ? __app_id : 'workshop-app-default';

// --- Constants ---
const SHIFTS = [
  { id: 'ca1', label: 'Ca 1', time: '7h00 - 9h00' },
  { id: 'ca2', label: 'Ca 2', time: '9h00 - 11h00' },
  { id: 'ca3', label: 'Ca 3', time: '13h00 - 15h00' },
  { id: 'ca4', label: 'Ca 4', time: '15h00 - 17h00' },
];

const EQUIPMENT = [
  { id: 'phay', name: 'Máy phay' },
  { id: 'cat', name: 'Máy cắt' },
  { id: 'mai', name: 'Máy mài' },
  { id: 'tien', name: 'Máy tiện' },
  { id: 'han', name: 'Máy hàn' },
];

const CLASSES = ['K62.CĐT.K02', 'K62.CĐT.K01'];
const MAX_PER_SHIFT = 5;

export default function WorkshopRegistrationApp() {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // View states: 'home', 'register_1', 'register_2', 'register_3', 'teacher_dashboard', 'student_mgmt'
  const [view, setView] = useState('home');

  // Registration State
  const [selectedClass, setSelectedClass] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    mssv: '',
    shift: '',
    equipment: [],
  });
  const [errorMsg, setErrorMsg] = useState('');

  // Student Mgmt State
  const [searchMssv, setSearchMssv] = useState('');
  const [studentRecord, setStudentRecord] = useState(null);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Auth error:', err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch all registrations from public data collection
    const regsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'registrations'
    );

    const unsubscribe = onSnapshot(
      regsRef,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort in memory by createdAt descending
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRegistrations(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching registrations:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- Helpers ---
  const getShiftCount = (shiftId) => {
    return registrations.filter((r) => r.shift === shiftId).length;
  };

  const isShiftFull = (shiftId) => {
    return getShiftCount(shiftId) >= MAX_PER_SHIFT;
  };

  const getShiftDetails = (shiftId) => {
    return SHIFTS.find((s) => s.id === shiftId) || { label: shiftId, time: '' };
  };

  const isMssvAlreadyRegistered = (mssv) => {
    return registrations.some(
      (r) => r.mssv.toLowerCase() === mssv.toLowerCase()
    );
  };

  const resetForm = () => {
    setFormData({ name: '', mssv: '', shift: '', equipment: [] });
    setSelectedClass('');
    setErrorMsg('');
  };

  const goHome = () => {
    setView('home');
    resetForm();
    setSearchMssv('');
    setStudentRecord(null);
  };

  // --- Handlers ---
  const startRegistration = (className) => {
    setSelectedClass(className);
    setView('register_1');
  };

  const handleNextStep1 = () => {
    setErrorMsg('');
    if (!formData.name.trim() || !formData.mssv.trim() || !formData.shift) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, MSSV và chọn ca thực hành.');
      return;
    }
    if (isMssvAlreadyRegistered(formData.mssv)) {
      setErrorMsg(
        'Mã số sinh viên này đã đăng ký rồi. Hãy vào phần Quản lý/Hủy đăng ký nếu cần thay đổi.'
      );
      return;
    }
    setView('register_2');
  };

  const handleNextStep2 = () => {
    setErrorMsg('');
    if (formData.equipment.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 dụng cụ thực hành.');
      return;
    }
    setView('register_3');
  };

  const handleToggleEquipment = (eqId) => {
    setFormData((prev) => {
      const current = prev.equipment;
      if (current.includes(eqId)) {
        return { ...prev, equipment: current.filter((id) => id !== eqId) };
      } else {
        return { ...prev, equipment: [...current, eqId] };
      }
    });
  };

  const handleSubmitRegistration = async () => {
    if (!user) return;
    try {
      const regsRef = collection(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'registrations'
      );
      await addDoc(regsRef, {
        className: selectedClass,
        name: formData.name.trim(),
        mssv: formData.mssv.trim().toUpperCase(),
        shift: formData.shift,
        equipment: formData.equipment,
        createdAt: new Date().toISOString(),
        userId: user.uid,
      });
      setView('success');
    } catch (err) {
      console.error('Lỗi đăng ký:', err);
      setErrorMsg('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
    }
  };

  const handleSearchStudent = () => {
    if (!searchMssv.trim()) return;
    const record = registrations.find(
      (r) => r.mssv.toUpperCase() === searchMssv.trim().toUpperCase()
    );
    setStudentRecord(record || 'not_found');
  };

  const handleCancelRegistration = async (docId) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'registrations', docId)
      );
      setStudentRecord(null);
      setSearchMssv('');
      // Show short feedback or just reset
    } catch (err) {
      console.error('Lỗi hủy đăng ký:', err);
    }
  };

  // --- Render Components ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderHome = () => (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-full mb-4">
          <Settings className="w-12 h-12 text-blue-700" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Hệ thống Đăng ký Xưởng Cơ Điện
        </h1>
        <p className="text-slate-500">Vui lòng chọn chức năng để tiếp tục</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Đăng ký thực hành
          </h2>
          <p className="text-sm text-slate-500">
            Dành cho sinh viên đăng ký ca làm việc tại xưởng.
          </p>
          <div className="space-y-3 pt-2">
            {CLASSES.map((cls) => (
              <button
                key={cls}
                onClick={() => startRegistration(cls)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-xl transition-all duration-200 group text-slate-700 hover:text-blue-700 font-medium"
              >
                <span>Lớp {cls}</span>
                <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-600" /> Quản lý hệ thống
            </h2>
            <button
              onClick={() => setView('teacher_dashboard')}
              className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-xl transition-all duration-200 font-medium text-left flex items-center gap-3"
            >
              <ClipboardList className="w-5 h-5" />
              Giáo viên quản lý
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" /> Sinh viên
            </h2>
            <button
              onClick={() => setView('student_mgmt')}
              className="w-full p-4 bg-teal-50 hover:bg-teal-100 border border-teal-100 text-teal-700 rounded-xl transition-all duration-200 font-medium text-left flex items-center gap-3"
            >
              <Search className="w-5 h-5" />
              Quản lý / Hủy đăng ký
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRegisterStep1 = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={goHome}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Đăng ký - Bước 1
          </h2>
          <p className="text-slate-500 text-sm">
            Lớp:{' '}
            <span className="font-semibold text-blue-600">{selectedClass}</span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Họ và tên
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Mã số sinh viên
            </label>
            <input
              type="text"
              value={formData.mssv}
              onChange={(e) =>
                setFormData({ ...formData, mssv: e.target.value.toUpperCase() })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
              placeholder="VD: CT01234"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Chọn ca thực hành
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHIFTS.map((shift) => {
              const full = isShiftFull(shift.id);
              const count = getShiftCount(shift.id);
              const selected = formData.shift === shift.id;

              return (
                <button
                  key={shift.id}
                  onClick={() =>
                    !full && setFormData({ ...formData, shift: shift.id })
                  }
                  disabled={full}
                  className={`
                    relative p-4 rounded-xl border-2 text-left transition-all duration-200
                    ${
                      full
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : selected
                        ? 'bg-blue-50 border-blue-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3
                        className={`font-semibold ${
                          full
                            ? 'text-slate-500'
                            : selected
                            ? 'text-blue-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {shift.label}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          full ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {shift.time}
                      </p>
                    </div>
                    {selected && <Check className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-medium">
                    <span
                      className={full ? 'text-red-500' : 'text-emerald-600'}
                    >
                      {count}/{MAX_PER_SHIFT} chỗ
                    </span>
                    {full && (
                      <span className="text-red-500 bg-red-50 px-2 py-1 rounded">
                        Đã hết chỗ
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={handleNextStep1}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );

  const renderRegisterStep2 = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-right-8 fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setView('register_1')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Đăng ký - Bước 2
          </h2>
          <p className="text-slate-500 text-sm">Chọn dụng cụ thực hành</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EQUIPMENT.map((eq) => {
            const isSelected = formData.equipment.includes(eq.id);
            return (
              <button
                key={eq.id}
                onClick={() => handleToggleEquipment(eq.id)}
                className={`
                  p-4 rounded-xl border-2 text-center transition-all duration-200 flex flex-col items-center gap-3
                  ${
                    isSelected
                      ? 'bg-blue-50 border-blue-600 shadow-sm text-blue-700'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                  }
                `}
              >
                <Wrench
                  className={`w-8 h-8 ${
                    isSelected ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span className="font-semibold">{eq.name}</span>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        <div className="flex justify-end pt-6 gap-3">
          <button
            onClick={() => setView('register_1')}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Quay lại
          </button>
          <button
            onClick={handleNextStep2}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );

  const renderRegisterStep3 = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-right-8 fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setView('register_2')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Xác nhận thông tin
          </h2>
          <p className="text-slate-500 text-sm">
            Vui lòng kiểm tra lại trước khi gửi
          </p>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 text-slate-700">
        <div className="grid grid-cols-3 border-b border-slate-200 pb-3">
          <span className="font-medium text-slate-500">Lớp:</span>
          <span className="col-span-2 font-semibold text-slate-900">
            {selectedClass}
          </span>
        </div>
        <div className="grid grid-cols-3 border-b border-slate-200 pb-3">
          <span className="font-medium text-slate-500">Họ và tên:</span>
          <span className="col-span-2 font-semibold text-slate-900">
            {formData.name}
          </span>
        </div>
        <div className="grid grid-cols-3 border-b border-slate-200 pb-3">
          <span className="font-medium text-slate-500">MSSV:</span>
          <span className="col-span-2 font-semibold text-slate-900">
            {formData.mssv}
          </span>
        </div>
        <div className="grid grid-cols-3 border-b border-slate-200 pb-3">
          <span className="font-medium text-slate-500">Ca thực hành:</span>
          <span className="col-span-2 font-semibold text-slate-900 text-blue-700">
            {getShiftDetails(formData.shift).label} (
            {getShiftDetails(formData.shift).time})
          </span>
        </div>
        <div className="grid grid-cols-3">
          <span className="font-medium text-slate-500">Dụng cụ:</span>
          <span className="col-span-2 font-medium text-slate-900">
            {formData.equipment
              .map((id) => EQUIPMENT.find((e) => e.id === id)?.name)
              .join(', ')}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      <div className="flex justify-end pt-6 gap-3">
        <button
          onClick={handleSubmitRegistration}
          className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" /> Cập nhật lên hệ thống
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center animate-in zoom-in duration-300">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Đăng ký thành công!
      </h2>
      <p className="text-slate-500 mb-8">
        Hệ thống đã ghi nhận lịch thực hành của bạn.
      </p>
      <button
        onClick={goHome}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        Trở về trang chủ
      </button>
    </div>
  );

  const renderTeacherDashboard = () => (
    <div className="max-w-6xl mx-auto bg-white p-4 sm:p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-300 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={goHome}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Danh sách đăng ký
            </h2>
            <p className="text-slate-500 text-sm">
              Quản lý lớp K62.CĐT - Tổng số: {registrations.length} sinh viên
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-sm font-semibold text-slate-700">Lớp</th>
              <th className="p-4 text-sm font-semibold text-slate-700">
                Họ và tên
              </th>
              <th className="p-4 text-sm font-semibold text-slate-700">MSSV</th>
              <th className="p-4 text-sm font-semibold text-slate-700">
                Ca thực hành
              </th>
              <th className="p-4 text-sm font-semibold text-slate-700">
                Dụng cụ
              </th>
              <th className="p-4 text-sm font-semibold text-slate-700">
                Thời gian đăng ký
              </th>
            </tr>
          </thead>
          <tbody>
            {registrations.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  Chưa có sinh viên nào đăng ký.
                </td>
              </tr>
            ) : (
              registrations.map((reg) => (
                <tr
                  key={reg.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4 text-sm text-slate-800 font-medium">
                    {reg.className}
                  </td>
                  <td className="p-4 text-sm text-slate-800">{reg.name}</td>
                  <td className="p-4 text-sm text-slate-600 font-mono">
                    {reg.mssv}
                  </td>
                  <td className="p-4 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getShiftDetails(reg.shift).label}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {reg.equipment
                      .map((id) => EQUIPMENT.find((e) => e.id === id)?.name)
                      .join(', ')}
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(reg.createdAt).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStudentManagement = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={goHome}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý cá nhân</h2>
          <p className="text-slate-500 text-sm">Tra cứu và hủy ca thực hành</p>
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={searchMssv}
          onChange={(e) => setSearchMssv(e.target.value.toUpperCase())}
          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
          placeholder="Nhập Mã số sinh viên của bạn (VD: CT0123)"
          onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()}
        />
        <button
          onClick={handleSearchStudent}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" /> Tìm kiếm
        </button>
      </div>

      {studentRecord === 'not_found' && (
        <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
          Không tìm thấy đăng ký nào với MSSV:{' '}
          <span className="font-semibold text-slate-700">{searchMssv}</span>
        </div>
      )}

      {studentRecord && studentRecord !== 'not_found' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Thông tin đăng ký</h3>
            <span className="text-xs text-slate-500">
              Đăng ký lúc:{' '}
              {new Date(studentRecord.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <span className="text-slate-500 block mb-1">Họ và tên</span>
                <span className="font-medium text-slate-900">
                  {studentRecord.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">MSSV</span>
                <span className="font-medium text-slate-900">
                  {studentRecord.mssv}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Lớp</span>
                <span className="font-medium text-slate-900">
                  {studentRecord.className}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Ca thực hành</span>
                <span className="inline-flex px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium text-xs">
                  {getShiftDetails(studentRecord.shift).label} (
                  {getShiftDetails(studentRecord.shift).time})
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block mb-1">
                  Dụng cụ đã chọn
                </span>
                <span className="font-medium text-slate-900">
                  {studentRecord.equipment
                    .map((id) => EQUIPMENT.find((e) => e.id === id)?.name)
                    .join(', ')}
                </span>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Bạn có chắc chắn muốn hủy đăng ký ca thực hành này không?'
                    )
                  ) {
                    handleCancelRegistration(studentRecord.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors"
              >
                <Trash2 className="w-5 h-5" /> Hủy đăng ký
              </button>
              <p className="text-xs text-center text-slate-400 mt-3">
                Sau khi hủy, bạn có thể đăng ký lại ca khác bất cứ lúc nào (nếu
                còn chỗ).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4 sm:p-8">
      {view === 'home' && renderHome()}
      {view === 'register_1' && renderRegisterStep1()}
      {view === 'register_2' && renderRegisterStep2()}
      {view === 'register_3' && renderRegisterStep3()}
      {view === 'success' && renderSuccess()}
      {view === 'teacher_dashboard' && renderTeacherDashboard()}
      {view === 'student_mgmt' && renderStudentManagement()}
    </div>
  );
}
