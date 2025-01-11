export default function About() {
    return (
        <div className="w-screen h-screen">
            <div className="h-screen flex justify-center items-center animate-entrance">
                <div>                    
                    
                </div>
                <div className="ml-6">
                    <div className="flex">
                        <p className="text-6xl text-gray-500 mb-6">A C T I O N I U M</p>
                        <span className="text-xs ml-7 text-gray-400 mt-10">versión 1.0</span>
                    </div>                    
                    <div className="ml-2 opacity-50 text-right">
                        <span>Powered By</span>
                        <img className="grayscale float-right ml-4" src="/yga-logo.png" width={111} alt="yGa - Icon"/>
                        <div className="text-sm">
                            <p className="text-xs uppercase">Contáctenos vía e-mail a <a className="text-blue-800" href="mailto:contacto@yga.cl">contacto@yga.cl</a></p>
                        </div>                    
                    </div>                    
                </div>
            </div>            
        </div>
    )
}