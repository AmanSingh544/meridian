import React from 'react';
import '../styles/AiWidget.css';

const AIWidgetLogo: React.FC = () => {
    return (
        <div className="logo-container">
            <div className="robot-wrapper">
                <div className="robot">
                    <div className="antenna"></div>
                    <div className="antenna-ball"></div>
                    <div className="head-outer">
                        <div className="ear-left"></div>
                        <div className="ear-right"></div>
                        <div className="face">
                            <div className="eyes">
                                <div className="eye"></div>
                                <div className="eye"></div>
                            </div>
                        </div>
                    </div>
                    {/*<div className="hands">
                        <div className="hand"></div>
                        <div className="hand"></div>
                        </div>
                    */}
                </div>
            </div>
            <div className="line-container">
                <div className="line"></div>
            </div>
            <div className="wordmark">AiVanta</div>
        </div>
    );
};

export default AIWidgetLogo;