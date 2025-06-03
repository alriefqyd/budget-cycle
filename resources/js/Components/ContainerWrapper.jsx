export default function ContainerWrapper({children}) {
    return (
        <div className="p-2 min-h-screen">
            {children}
        </div>
        )
    }
