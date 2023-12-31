import { FC } from 'react';
import {
    Container,
    VStack,
    Heading,
    Link,
    Flex,
    Badge,
    Text,

    Box,
    useColorModeValue
} from '@chakra-ui/react';
import { Element } from 'react-scroll';
import {Fade,Flip} from 'react-awesome-reveal';


const Contact: FC = () => {
    return (
        <Element name='contact'>
            <Container maxW={'8xl'} p={6.75} mt={10}>
                <VStack spacing={8}>
                    <Fade>
                        <Heading as='h2'>Contact me</Heading>
                    </Fade>
                    <Flip>
                        <Box
                            maxW={'85vw'}
                            w={'xl'}
                            bg={useColorModeValue('white', 'gray.900')}
                            boxShadow={'xl'}
                            rounded={'md'}
                            p={6}
                            pb={8}
                            overflow={'hidden'}
                        >
                            <Flex textAlign={'center'}>
                                <Container w='50%'>
                                    <Link href="mailto:dyen2018@gmail.com">
                                        <Badge colorScheme='green'>Personal</Badge>
                                        <Text textDecoration={'underline'}>dyen2018@gmail.com</Text>
                                    </Link>
                                </Container>
                            </Flex>
                        </Box>
                    </Flip>
                </VStack>
            </Container>
        </Element>
    );
};

export default Contact;