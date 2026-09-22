const { useState, useEffect } = React;

function App() {
    const [keys, setKeys] = useState([]);
    const [provider, setProvider] = useState('');
    const [modelName, setModelName] = useState('');
    const [credits, setCredits] = useState(0);

    useEffect(() => {
        fetch('/api/keys')
            .then(r => r.json())
            .then(d => setKeys(d.keys || []))
            .catch(e => console.error(e));
    }, []);

    return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
        React.createElement('header', { className: 'bg-white border-b border-gray-200' },
            React.createElement('div', { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
                React.createElement('div', { className: 'flex justify-between items-center h-16' },
                    React.createElement('h1', { className: 'text-2xl font-bold text-gray-900' }, '⚡ AI Marketplace'),
                    React.createElement('div', { className: 'flex items-center space-x-4' },
                        React.createElement('div', { className: 'flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full' },
                            React.createElement('span', { className: 'text-sm font-medium text-gray-700' }, 'PTS'),
                            React.createElement('span', { className: 'text-sm font-bold text-gray-900' }, credits)
                        )
                    )
                )
            )
        ),
        React.createElement('main', { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' },
            React.createElement('div', { className: 'bg-white rounded-lg shadow-sm p-6 mb-6' },
                React.createElement('h2', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Available Models'),
                React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
                    keys.map(key => 
                        React.createElement('div', { key: key.id, className: 'bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6' },
                            React.createElement('div', { className: 'flex items-start justify-between' },
                                React.createElement('div', null,
                                    React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, key.model_name),
                                    React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, key.provider)
                                ),
                                React.createElement('span', { className: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800' }, 'Active')
                            ),
                            React.createElement('div', { className: 'mt-4' },
                                React.createElement('div', { className: 'flex items-baseline' },
                                    React.createElement('span', { className: 'text-2xl font-bold text-gray-900' }, key.price_per_1k),
                                    React.createElement('span', { className: 'ml-1 text-sm text-gray-500' }, ' PTS / 1k tokens')
                                ),
                                React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, key.remaining_tokens + ' tokens remaining')
                            ),
                            React.createElement('button', { className: 'mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700' }, 'Buy Tokens')
                        )
                    )
                )
            )
        )
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));