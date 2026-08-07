import React, { useEffect, useState } from 'react';
import {
    CaseSummary, PublicTask, Role, StaffCase, clearToken, fetchCases, fetchTasks, logout,
    readToken, restoreSession, saveToken, toUserMessage,
} from './lib/api';
import LoginView from './components/LoginView';
import MournerView from './components/MournerView';
import StaffView from './components/StaffView';

const App: React.FC = () => {
    const [booting, setBooting] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<Role | null>(null);

    const [caseSummary, setCaseSummary] = useState<CaseSummary | null>(null);
    const [tasks, setTasks] = useState<PublicTask[]>([]);
    const [cases, setCases] = useState<StaffCase[]>([]);
    const [openedCaseId, setOpenedCaseId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 保存済みのトークンで再開する
    useEffect(() => {
        const saved = readToken();
        if (!saved) {
            setBooting(false);
            return;
        }

        restoreSession(saved)
            .then(async result => {
                setToken(saved);
                setRole(result.role);
                setCaseSummary(result.case);
                if (result.role === 'mourner') await loadMourner(saved);
                else setCases(await fetchCases(saved));
            })
            .catch(() => {
                clearToken();
            })
            .finally(() => setBooting(false));
    }, []);

    const loadMourner = async (activeToken: string) => {
        const result = await fetchTasks(activeToken);
        setCaseSummary(result.case);
        setTasks(result.tasks);
    };

    const handleLoggedIn = async (
        nextToken: string, nextRole: Role, nextCase: CaseSummary | null,
    ) => {
        saveToken(nextToken);
        setToken(nextToken);
        setRole(nextRole);
        setCaseSummary(nextCase);
        setError('');
        setLoading(true);
        try {
            if (nextRole === 'mourner') await loadMourner(nextToken);
            else setCases(await fetchCases(nextToken));
        } catch (e) {
            setError(toUserMessage(e));
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (token) {
            try {
                await logout(token);
            } catch {
                // 期限切れなどで失敗しても、手元のトークンは消す
            }
        }
        clearToken();
        setToken(null);
        setRole(null);
        setCaseSummary(null);
        setTasks([]);
        setCases([]);
        setOpenedCaseId(null);
    };

    const openStaffCase = async (estimateId: number) => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const result = await fetchTasks(token, estimateId);
            setOpenedCaseId(estimateId);
            setCaseSummary(result.case);
            setTasks(result.tasks);
        } catch (e) {
            setError(toUserMessage(e));
        } finally {
            setLoading(false);
        }
    };

    const reload = async () => {
        if (!token) return;
        try {
            if (role === 'mourner') await loadMourner(token);
            else if (openedCaseId) {
                const result = await fetchTasks(token, openedCaseId);
                setTasks(result.tasks);
            }
        } catch (e) {
            setError(toUserMessage(e));
        }
    };

    if (booting) {
        return <div className="boot">読み込み中...</div>;
    }

    if (!token || !role) {
        return <LoginView onLoggedIn={handleLoggedIn} />;
    }

    if (role === 'staff') {
        return (
            <StaffView
                token={token}
                cases={cases}
                openedCaseId={openedCaseId}
                caseSummary={caseSummary}
                tasks={tasks}
                loading={loading}
                error={error}
                onOpenCase={openStaffCase}
                onCloseCase={() => setOpenedCaseId(null)}
                onChanged={reload}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <MournerView
            token={token}
            caseSummary={caseSummary}
            tasks={tasks}
            loading={loading}
            error={error}
            onChanged={reload}
            onLogout={handleLogout}
        />
    );
};

export default App;
