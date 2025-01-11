'use client'
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";

export default function CustomWebCam(props) {
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);
    const capture = useCallback(() => {
        const imgSrc = webcamRef.current.getScreenshot();
        setImgSrc(new imgSrc);
        props.setImageFunction(imgSrc);
        props.hideFunction();
    }, [webcamRef]);

    return (
        <>
            {props.active &&  
                <div className="fixed left-0 top-0 z-50 bg-black w-full h-full">                    
                        <Webcam ref={webcamRef} className="z-50 w-full h-full" />
                        <div className="w-full absolute top-40 h-full mt-2 mb-10">
                            <div className="border-white border-dashed border-8 w-1/5 h-3/5 m-auto scale-125"></div>
                        </div>
                        <div className="w-full absolute bottom-0 text-center">
                            <button className="rounded-full bg-red-600 w-20 h-20 m-4" onClick={capture}>&nbsp;</button>
                        </div>
                </div>
            }            
        </>
    )
}
