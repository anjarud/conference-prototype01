import React, { useEffect, useState } from 'react';

function Home() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/data');
                if (!response.ok) {
                    throw new Error('Netzwerkantwort war nicht ok');
                }
                const result = await response.json();
                setData(result);
            } catch (error) {
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div>Lade...</div>;
    if (error) return <div>Fehler: {error.message}</div>;

    return (
        <div>
            <h1>Home</h1>
            <h2>Antwort vom Backend:</h2>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}

export default Home;
