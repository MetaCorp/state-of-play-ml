const Step = ({ isVisible, children }) => (
    isVisible ? <li>{children}</li> : null
)

const Steps = ({ items, step }) => (
    <ul style={{ textAlign: 'left', minWidth: 570 }}>
        {items.map((item, i) => <Step key={i} isVisible={i <= step}>{item.step}{' '}{item.progress && <span style={{ color: 'grey' }}>{item.progress}%</span>}</Step>)}    
    </ul>
)

export default Steps