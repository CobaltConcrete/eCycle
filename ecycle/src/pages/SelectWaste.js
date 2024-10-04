import React from 'react';

const SelectWaste = () => {
    return (
        <div className="select-waste-container" style={styles.container}>
            <h2>Select Waste</h2>
            <p>Please select the type of waste you would like to dispose of or recycle.</p>
            {/* Add your waste selection options here */}
            <button style={styles.button} onClick={() => alert('Waste selected!')}>
                Select Waste Type
            </button>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f4f4f4',
    },
    button: {
        padding: '10px',
        backgroundColor: '#5cb85c',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        cursor: 'pointer',
    },
};

export default SelectWaste;
