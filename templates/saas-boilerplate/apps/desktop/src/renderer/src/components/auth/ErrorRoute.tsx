import { useNavigate } from 'react-router-dom'
import ErrorPage from '@workspace/ui/blocks/auth/ErrorPage'

export default function ErrorRoute() {
    const navigate = useNavigate();
    return (
        <ErrorPage
            errorMessage={"Oops! Something went wrong!"}
            onBackToLoginClick={() => navigate('/sign-in')}
        />
    )
}